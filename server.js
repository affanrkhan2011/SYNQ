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

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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

