import { supabase } from './supabaseClient';

export async function upsertMe(payload: { email: string; displayName: string }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('No authenticated user');

  const { error } = await supabase.from('users').upsert({
    id: user.id,
    email: payload.email,
    display_name: payload.displayName,
  });
  if (error) throw error;
  return true;
}

export async function listProjects() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('No authenticated user');

  const { data, error } = await supabase
    .from('memberships')
    .select('project_id, role, projects(id, name, owner_id, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false, foreignTable: 'projects' });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.project_id,
    groupId: row.project_id,
    groupName: row.projects?.name,
    joinedAt: row.projects?.created_at,
    role: row.role,
  }));
}

export async function createProject(payload: { id: string; name: string }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('No authenticated user');

  const { error: projectError } = await supabase.from('projects').insert({
    id: payload.id,
    name: payload.name,
    owner_id: user.id,
  });
  if (projectError) throw projectError;

  const { error: membershipError } = await supabase.from('memberships').insert({
    user_id: user.id,
    project_id: payload.id,
    role: 'owner',
  });
  if (membershipError) throw membershipError;

  return { groupId: payload.id, groupName: payload.name };
}

