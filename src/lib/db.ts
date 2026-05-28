import { supabase } from './supabaseClient';

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No authenticated user');
  return user.id;
}

export async function upsertMe(payload: { email: string; displayName: string }) {
  const userId = await currentUserId();
  const { error } = await supabase.from('users').upsert({
    id: userId,
    email: payload.email,
    display_name: payload.displayName,
  });
  if (error) throw error;
  return true;
}

export async function listProjects() {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('memberships')
    .select('project_id, role, created_at, projects(id, name, owner_id, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.project_id,
    groupId: row.project_id,
    groupName: row.projects?.name,
    joinedAt: row.created_at,
    role: row.role,
  }));
}

export async function createProject(payload: { id: string; name: string }) {
  const userId = await currentUserId();

  const { error: projectError } = await supabase.from('projects').insert({
    id: payload.id,
    name: payload.name,
    owner_id: userId,
  });
  if (projectError) throw projectError;

  const { error: membershipError } = await supabase.from('memberships').insert({
    user_id: userId,
    project_id: payload.id,
    role: 'owner',
  });
  if (membershipError) throw membershipError;

  return { groupId: payload.id, groupName: payload.name };
}

