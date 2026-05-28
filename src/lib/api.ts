import { supabase } from './supabaseClient';

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No authenticated user');
  return user.id;
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, name: string) {
  const { error } = await supabase.from('projects').update({ name }).eq('id', id);
  if (error) throw error;
  return { ok: true };
}

export async function getMembers(projectId: string) {
  const { data, error } = await supabase
    .from('memberships')
    .select('user_id, role, created_at, users(id, email, display_name)')
    .eq('project_id', projectId);
  if (error) throw error;
  return data || [];
}

export async function joinProject(projectId: string) {
  const userId = await currentUserId();
  const { error } = await supabase.from('memberships').insert({
    user_id: userId,
    project_id: projectId,
    role: 'member',
  });
  if (error) throw error;
  return { ok: true };
}

export async function getMembership(projectId: string) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
  const { error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw error;
  return { ok: true };
}

export async function removeMember(projectId: string, userId: string) {
  const { error } = await supabase.from('memberships').delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
  return { ok: true };
}

export async function getTasks(projectId: string) {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertTask(projectId: string, task: any) {
  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    project_id: projectId,
    title: task.title,
    description: task.description,
    assignee_id: task.assignee_id,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    created_by: task.created_by,
  });
  if (error) throw error;
  return { ok: true };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
  return { ok: true };
}

export async function getMessages(projectId: string) {
  const { data, error } = await supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage(projectId: string, message: any) {
  const { error } = await supabase.from('messages').insert({
    id: message.id,
    project_id: projectId,
    text: message.text,
    sender_id: message.sender_id,
  });
  if (error) throw error;
  return { ok: true };
}

export async function getDocuments(projectId: string) {
  const { data, error } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addDocument(projectId: string, document: any) {
  const { error } = await supabase.from('documents').insert({
    id: document.id,
    project_id: projectId,
    title: document.title,
    url: document.url,
    created_by: document.created_by,
  });
  if (error) throw error;
  return { ok: true };
}

export async function removeDocument(docId: string) {
  const { error } = await supabase.from('documents').delete().eq('id', docId);
  if (error) throw error;
  return { ok: true };
}

