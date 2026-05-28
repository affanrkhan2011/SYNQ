-- SYNQ Supabase schema
-- Matches the current app data model: users, projects, memberships, tasks, messages, and documents.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  name text not null,
  owner_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id text not null references public.users(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table if not exists public.tasks (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id text references public.users(id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  text text not null,
  sender_id text references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  url text not null,
  created_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_project_id on public.memberships(project_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_messages_project_id on public.messages(project_id);
create index if not exists idx_documents_project_id on public.documents(project_id);

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;

drop policy if exists "users_read_own" on public.users;
create policy "users_read_own"
  on public.users for select
  using (auth.uid()::text = id);

drop policy if exists "users_write_own" on public.users;
create policy "users_write_own"
  on public.users for insert
  with check (auth.uid()::text = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

drop policy if exists "projects_member_read" on public.projects;
create policy "projects_member_read"
  on public.projects for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = projects.id
        and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "projects_owner_write" on public.projects;
create policy "projects_owner_write"
  on public.projects for insert
  with check (auth.uid()::text = owner_id);

drop policy if exists "projects_owner_update" on public.projects;
create policy "projects_owner_update"
  on public.projects for update
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = projects.id
        and m.user_id = auth.uid()::text
        and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.project_id = projects.id
        and m.user_id = auth.uid()::text
        and m.role = 'owner'
    )
  );

drop policy if exists "memberships_self_read" on public.memberships;
create policy "memberships_self_read"
  on public.memberships for select
  using (auth.uid()::text = user_id);

drop policy if exists "memberships_self_write" on public.memberships;
create policy "memberships_self_write"
  on public.memberships for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "memberships_owner_update" on public.memberships;
create policy "memberships_owner_update"
  on public.memberships for update
  using (
    exists (
      select 1
      from public.memberships owner_membership
      where owner_membership.project_id = memberships.project_id
        and owner_membership.user_id = auth.uid()::text
        and owner_membership.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.memberships owner_membership
      where owner_membership.project_id = memberships.project_id
        and owner_membership.user_id = auth.uid()::text
        and owner_membership.role = 'owner'
    )
  );

drop policy if exists "memberships_owner_delete_or_self" on public.memberships;
create policy "memberships_owner_delete_or_self"
  on public.memberships for delete
  using (
    auth.uid()::text = user_id or exists (
      select 1
      from public.memberships owner_membership
      where owner_membership.project_id = memberships.project_id
        and owner_membership.user_id = auth.uid()::text
        and owner_membership.role = 'owner'
    )
  );

drop policy if exists "tasks_project_member_read" on public.tasks;
create policy "tasks_project_member_read"
  on public.tasks for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = tasks.project_id
        and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "tasks_project_member_write" on public.tasks;
create policy "tasks_project_member_write"
  on public.tasks for all
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = tasks.project_id
        and m.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.project_id = tasks.project_id
        and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "messages_project_member_read" on public.messages;
create policy "messages_project_member_read"
  on public.messages for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = messages.project_id
        and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "messages_project_member_write" on public.messages;
create policy "messages_project_member_write"
  on public.messages for all
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = messages.project_id
        and m.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.project_id = messages.project_id
        and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "documents_project_member_read" on public.documents;
create policy "documents_project_member_read"
  on public.documents for select
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = documents.project_id
        and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "documents_project_member_write" on public.documents;
create policy "documents_project_member_write"
  on public.documents for all
  using (
    exists (
      select 1
      from public.memberships m
      where m.project_id = documents.project_id
        and m.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.project_id = documents.project_id
        and m.user_id = auth.uid()::text
    )
  );

