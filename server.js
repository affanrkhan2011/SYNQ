import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import admin from 'firebase-admin';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
    return;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
};

initializeFirebaseAdmin();

const withAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const bootstrap = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner','member')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, project_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date DATE,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};

app.get('/api/health', async (_, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false });
  }
});

app.post('/api/me/upsert', withAuth, async (req, res) => {
  const userId = req.user.uid;
  const email = req.user.email || req.body.email || '';
  const displayName = req.body.displayName || req.user.name || email || 'User';

  if (!email) {
    return res.status(400).json({ error: 'User email is required' });
  }

  await pool.query(
    `
      INSERT INTO users (id, email, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id)
      DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name
    `,
    [userId, email, displayName],
  );

  return res.json({
    id: userId,
    email,
    displayName,
  });
});

app.get('/api/projects', withAuth, async (req, res) => {
  const userId = req.user.uid;
  const { rows } = await pool.query(
    `
      SELECT p.id AS "groupId", p.name AS "groupName", m.created_at AS "joinedAt"
      FROM memberships m
      INNER JOIN projects p ON p.id = m.project_id
      WHERE m.user_id = $1
      ORDER BY p.created_at DESC
    `,
    [userId],
  );

  return res.json(rows);
});

app.post('/api/projects', withAuth, async (req, res) => {
  const userId = req.user.uid;
  const { id, name, displayName, email } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'Project id and name are required' });
  }

  const trimmedName = String(name).trim();
  if (!trimmedName) {
    return res.status(400).json({ error: 'Project name cannot be empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO users (id, email, display_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id)
        DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name
      `,
      [userId, email || req.user.email || '', displayName || req.user.name || 'User'],
    );

    await client.query(
      `INSERT INTO projects (id, name, owner_id) VALUES ($1, $2, $3)`,
      [id, trimmedName, userId],
    );

    await client.query(
      `INSERT INTO memberships (user_id, project_id, role) VALUES ($1, $2, 'owner')`,
      [userId, id],
    );

    await client.query('COMMIT');
    return res.status(201).json({ groupId: id, groupName: trimmedName });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// -- Group Details & Memberships --
app.get('/api/projects/:id', withAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`SELECT * FROM projects WHERE id = $1`, [id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.put('/api/projects/:id', withAuth, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  await pool.query(`UPDATE projects SET name = $1 WHERE id = $2`, [name, id]);
  res.json({ ok: true });
});

app.get('/api/projects/:id/members', withAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT m.user_id, m.role, u.email, u.display_name
     FROM memberships m JOIN users u ON m.user_id = u.id
     WHERE m.project_id = $1`,
    [id]
  );
  res.json(rows);
});

app.post('/api/projects/:id/members', withAuth, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  await pool.query(
    `INSERT INTO memberships (user_id, project_id, role) VALUES ($1, $2, $3)`,
    [req.user.uid, id, role || 'member']
  );
  res.json({ ok: true });
});

app.get('/api/projects/:id/membership', withAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM memberships WHERE project_id = $1 AND user_id = $2`,
    [id, req.user.uid]
  );
  res.json(rows[0] || null);
});

app.put('/api/projects/:id/members/:userId', withAuth, async (req, res) => {
  const { id, userId } = req.params;
  const { role } = req.body;
  await pool.query(
    `UPDATE memberships SET role = $1 WHERE project_id = $2 AND user_id = $3`,
    [role, id, userId]
  );
  res.json({ ok: true });
});

app.delete('/api/projects/:id/members/:userId', withAuth, async (req, res) => {
  const { id, userId } = req.params;
  await pool.query(
    `DELETE FROM memberships WHERE project_id = $1 AND user_id = $2`,
    [id, userId]
  );
  res.json({ ok: true });
});

// -- Tasks --
app.get('/api/projects/:id/tasks', withAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  res.json(rows);
});

app.post('/api/projects/:id/tasks', withAuth, async (req, res) => {
  const { id } = req.params;
  const t = req.body;
  await pool.query(
    `INSERT INTO tasks (id, project_id, title, description, assignee_id, status, priority, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, description = EXCLUDED.description, assignee_id = EXCLUDED.assignee_id,
       status = EXCLUDED.status, priority = EXCLUDED.priority, due_date = EXCLUDED.due_date`,
    [t.id, id, t.title, t.description, t.assignee_id, t.status, t.priority, t.due_date, t.created_by]
  );
  res.json({ ok: true });
});

app.put('/api/tasks/:id', withAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await pool.query(`UPDATE tasks SET status = $1 WHERE id = $2`, [status, id]);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', withAuth, async (req, res) => {
  const { id } = req.params;
  await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
  res.json({ ok: true });
});

// -- Messages --
app.get('/api/projects/:id/messages', withAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM messages WHERE project_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  res.json(rows);
});

app.post('/api/projects/:id/messages', withAuth, async (req, res) => {
  const { id } = req.params;
  const { id: msgId, text, sender_id } = req.body;
  await pool.query(
    `INSERT INTO messages (id, project_id, text, sender_id) VALUES ($1, $2, $3, $4)`,
    [msgId, id, text, sender_id]
  );
  res.json({ ok: true });
});

// -- Documents --
app.get('/api/projects/:id/documents', withAuth, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM documents WHERE project_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  res.json(rows);
});

app.post('/api/projects/:id/documents', withAuth, async (req, res) => {
  const { id } = req.params;
  const { id: docId, title, url, created_by } = req.body;
  await pool.query(
    `INSERT INTO documents (id, project_id, title, url, created_by) VALUES ($1, $2, $3, $4, $5)`,
    [docId, id, title, url, created_by]
  );
  res.json({ ok: true });
});

app.delete('/api/documents/:id', withAuth, async (req, res) => {
  const { id } = req.params;
  await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (!process.env.VERCEL) {
  bootstrap()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server listening on ${port}`);
      });
    })
    .catch((error) => {
      console.error('Bootstrap failed', error);
      process.exit(1);
    });
} else {
  bootstrap().catch((error) => {
    console.error('Bootstrap failed', error);
  });
}

export default app;

