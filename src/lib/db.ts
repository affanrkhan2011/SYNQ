import { auth } from './firebase';

const getApiBase = () => {
  // If we are in production and running on the same domain as the server, it will be relative.
  // In Vite dev mode, we usually need the absolute URL or a proxy, but assuming the Node backend is on port 3000
  // or via VITE_API_URL. Let's use the current origin if not localhost, otherwise localhost:3000
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''; // same origin
  }
  return 'http://localhost:3000';
};

const API_BASE = getApiBase();

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function upsertMe(payload: { email: string; displayName: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/me/upsert`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upsert user profile');
  }
  return true;
}

export async function listProjects() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'GET',
    headers
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch projects');
  }
  return res.json();
}

export async function createProject(payload: { id: string; name: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create project');
  }
  return res.json();
}

