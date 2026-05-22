import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function authHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user');
  }

  const token = await currentUser.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function request(path: string, init: RequestInit = {}) {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return response.json();
}

export async function upsertMe(payload: { email: string; displayName: string }) {
  return request('/api/me/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listProjects() {
  return request('/api/projects');
}

export async function createProject(payload: {
  id: string;
  name: string;
  displayName: string;
  email: string;
}) {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

