import { auth } from './firebase';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '';
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

export async function fetchProject(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function updateProject(id: string, name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'PUT', headers, body: JSON.stringify({ name }) });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function getMembers(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/members`, { headers });
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export async function joinProject(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/members`, { method: 'POST', headers, body: JSON.stringify({ role: 'member' }) });
  if (!res.ok) throw new Error('Failed to join project');
  return res.json();
}

export async function getMembership(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/membership`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/members/${userId}`, { method: 'PUT', headers, body: JSON.stringify({ role }) });
  if (!res.ok) throw new Error('Failed to update role');
  return res.json();
}

export async function removeMember(projectId: string, userId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/members/${userId}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to remove member');
  return res.json();
}

export async function getTasks(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/tasks`, { headers });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function upsertTask(projectId: string, task: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/tasks`, { method: 'POST', headers, body: JSON.stringify(task) });
  if (!res.ok) throw new Error('Failed to upsert task');
  return res.json();
}

export async function updateTaskStatus(taskId: string, status: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
  if (!res.ok) throw new Error('Failed to update task status');
  return res.json();
}

export async function deleteTask(taskId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to delete task');
  return res.json();
}

export async function getMessages(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/messages`, { headers });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function sendMessage(projectId: string, message: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/messages`, { method: 'POST', headers, body: JSON.stringify(message) });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function getDocuments(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents`, { headers });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function addDocument(projectId: string, document: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents`, { method: 'POST', headers, body: JSON.stringify(document) });
  if (!res.ok) throw new Error('Failed to add document');
  return res.json();
}

export async function removeDocument(docId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/documents/${docId}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}
