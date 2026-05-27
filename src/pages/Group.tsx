import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useUser } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle2, Circle, Search, Filter, AlertTriangle, Calendar, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

type TaskStatus = 'todo' | 'in_progress' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high';
type GroupMemberRole = 'owner' | 'member' | null;

interface GroupData {
  id: string;
  name: string;
  ownerId: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
}

interface GroupMember {
  id: string;
  role: 'owner' | 'member';
  displayName?: string | null;
  email?: string | null;
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt?: string | null;
}

interface LinkedDoc {
  id: string;
  title: string;
  url: string;
  createdBy: string;
  createdAt?: string | null;
}

const formatTimestamp = (value: any) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const todayIsoDate = () => new Date().toISOString().split('T')[0];

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<GroupMemberRole>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'docs' | 'admin'>('tasks');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !groupId) return;

    const load = async () => {
      try {
        setLoading(true);

        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', groupId)
          .single();
        if (projectError || !project) {
          navigate('/');
          return;
        }

        setGroup({ id: project.id, name: project.name, ownerId: project.owner_id });

        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select('*')
          .eq('project_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (membershipError) throw membershipError;

        setIsMember(Boolean(membership));
        setMemberRole((membership?.role as any) ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [groupId, user, navigate]);

  const handleJoin = async () => {
    if (!user || !groupId || !group) return;
    try {
      const { error } = await supabase.from('memberships').insert({
        user_id: user.id,
        project_id: groupId,
        role: 'member',
      });
      if (error) throw error;

      setIsMember(true);
      setMemberRole('member');
    } catch (err) {
      console.error(err);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isMember) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20 text-center border border-white/20 p-12 bg-white/[0.02]">
          <div className="w-16 h-16 border border-white/40 flex items-center justify-center mx-auto mb-6 font-bold text-xl uppercase">
            {group?.name?.substring(0, 2)}
          </div>
          <h2 className="text-xl font-bold mb-2 uppercase tracking-wide">Join {group?.name}</h2>
          <p className="text-white/50 text-xs mb-8 uppercase tracking-widest">You've been invited to collaborate.</p>
          <button
            onClick={handleJoin}
            className="w-full border border-white bg-white text-black py-4 font-bold text-xs uppercase hover:bg-black hover:text-white transition-colors"
          >
            Accept Invitation
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={
        <div className="flex items-center justify-between w-full font-sans gap-4">
          <div>
            <h1 className="font-bold text-xl uppercase tracking-tight">{group?.name}</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Collaborative Team Workspace</p>
          </div>
          <button
            onClick={copyInviteLink}
            className="px-5 py-2 bg-white text-black text-xs font-bold uppercase transition-colors hover:bg-white/90"
          >
            {copied ? 'Copied' : 'Share Link'}
          </button>
        </div>
      }
    >
      <div className="mb-8 border-b border-white/20 flex gap-8 overflow-auto">
        <button
          onClick={() => setActiveTab('tasks')}
          className={clsx(
            'pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2',
            activeTab === 'tasks' ? 'border-b border-white text-white' : 'border-b border-transparent text-white/50 hover:text-white',
          )}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={clsx(
            'pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2',
            activeTab === 'chat' ? 'border-b border-white text-white' : 'border-b border-transparent text-white/50 hover:text-white',
          )}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={clsx(
            'pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2',
            activeTab === 'docs' ? 'border-b border-white text-white' : 'border-b border-transparent text-white/50 hover:text-white',
          )}
        >
          Documents
        </button>
        {memberRole === 'owner' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={clsx(
              'pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2',
              activeTab === 'admin'
                ? 'border-b border-white text-white'
                : 'border-b border-transparent text-white/50 hover:text-white',
            )}
          >
            Admin
          </button>
        )}
      </div>

      <div className="mt-6 font-sans">
        {activeTab === 'tasks' && <TasksView groupId={groupId!} />}
        {activeTab === 'chat' && <ChatView groupId={groupId!} />}
        {activeTab === 'docs' && <DocsView groupId={groupId!} />}
        {activeTab === 'admin' && memberRole === 'owner' && <AdminView groupId={groupId!} />}
      </div>
    </Layout>
  );
}

function TasksView({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'mine'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', groupId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setTasks(
      (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        assigneeId: t.assignee_id,
        status: t.status,
        priority: t.priority || 'medium',
        dueDate: t.due_date,
        createdAt: t.created_at,
        createdBy: t.created_by,
      })),
    );
  };

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('memberships')
      .select('user_id, role, users(id, email, display_name)')
      .eq('project_id', groupId);
    if (error) throw error;
    setMembers(
      (data || []).map((m: any) => ({
        id: m.user_id,
        role: m.role,
        displayName: m.users?.display_name,
        email: m.users?.email,
      })),
    );
  };

  useEffect(() => {
    void loadTasks().catch(console.error);
    void loadMembers().catch(console.error);
  }, [groupId]);

  useEffect(() => {
    if (!taskAssigneeId && user?.id) setTaskAssigneeId(user.id);
  }, [taskAssigneeId, user?.id]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !term || task.title?.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assigneeId === user?.id;
      const matchesPriority = priorityFilter === 'all' || (task.priority ?? 'medium') === priorityFilter;
      return matchesSearch && matchesStatus && matchesAssignee && matchesPriority;
    });
  }, [tasks, search, statusFilter, assigneeFilter, priorityFilter, user?.id]);

  const summary = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => t.dueDate && t.status !== 'completed' && t.dueDate < todayIsoDate()).length;
    return { todo, inProgress, completed, overdue };
  }, [tasks]);

  const memberLabelById = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    return m?.displayName || m?.email || memberId;
  };

  const openCreateTask = () => {
    if (!user) return;
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('todo');
    setTaskAssigneeId(user.id);
    setTaskPriority('medium');
    setTaskDueDate('');
    setShowTaskModal(true);
  };

  const openEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskStatus(task.status || 'todo');
    setTaskAssigneeId(task.assigneeId || user?.id || '');
    setTaskPriority(task.priority || 'medium');
    setTaskDueDate(task.dueDate || '');
    setShowTaskModal(true);
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!taskTitle.trim()) return;
    if (!taskAssigneeId) return;

    const payload: any = {
      id: editingTask?.id || uuidv4(),
      project_id: groupId,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      assignee_id: taskAssigneeId,
      status: taskStatus,
      priority: taskPriority,
      due_date: taskDueDate || null,
      created_by: editingTask?.createdBy || user.id,
    };

    const { error } = await supabase.from('tasks').upsert(payload);
    if (error) {
      console.error(error);
      return;
    }

    await loadTasks().catch(console.error);
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const toggleTask = async (task: TaskItem) => {
    const next: TaskStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'todo';
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id);
    if (error) console.error(error);
    await loadTasks().catch(console.error);
  };

  const deleteTask = async () => {
    if (!editingTask) return;
    const { error } = await supabase.from('tasks').delete().eq('id', editingTask.id);
    if (error) console.error(error);
    await loadTasks().catch(console.error);
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const priorityBadge = (priority?: TaskPriority) => {
    const value = priority || 'medium';
    const classMap: Record<TaskPriority, string> = {
      low: 'text-emerald-300 border-emerald-300/50',
      medium: 'text-amber-300 border-amber-300/50',
      high: 'text-red-300 border-red-300/50',
    };
    return <span className={clsx('px-2 py-1 text-[9px] border uppercase tracking-widest font-bold', classMap[value])}>{value}</span>;
  };

  return (
    <div className="font-sans">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Todo" value={summary.todo} />
        <StatCard label="In Progress" value={summary.inProgress} />
        <StatCard label="Completed" value={summary.completed} />
        <StatCard label="Overdue" value={summary.overdue} danger={summary.overdue > 0} />
      </div>

      <div className="mb-6 p-4 border border-white/20 bg-white/[0.02] flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              className="w-full pl-9 pr-3 py-3 bg-transparent border border-white/20 text-xs uppercase tracking-widest focus:border-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateTask}
            className="border border-white bg-white text-black px-6 py-3 text-[10px] font-bold uppercase transition-colors hover:bg-black hover:text-white"
          >
            New Task
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
          <span className="text-white/40 inline-flex items-center gap-1"><Filter className="w-3 h-3" />Filters</span>
          <FilterChip label="All" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          <FilterChip label="Todo" active={statusFilter === 'todo'} onClick={() => setStatusFilter('todo')} />
          <FilterChip label="In Progress" active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')} />
          <FilterChip label="Completed" active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
          <FilterChip label="My Tasks" active={assigneeFilter === 'mine'} onClick={() => setAssigneeFilter(assigneeFilter === 'mine' ? 'all' : 'mine')} />
          <FilterChip label="High Priority" active={priorityFilter === 'high'} onClick={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredTasks.map((task) => {
          const overdue = Boolean(task.dueDate && task.status !== 'completed' && task.dueDate < todayIsoDate());
          return (
            <div
              key={task.id}
              className={clsx(
                'flex items-start gap-4 p-5 border bg-white/[0.02] transition-colors cursor-pointer',
                overdue ? 'border-red-500/40' : 'border-white/[0.15] hover:border-white/40',
              )}
              role="button"
              tabIndex={0}
              onClick={() => openEditTask(task)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openEditTask(task);
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleTask(task);
                }}
                type="button"
                aria-label="Change task status"
                title="Change status"
                className={clsx(
                  'w-5 h-5 border flex items-center justify-center shrink-0 mt-1 transition-colors',
                  task.status === 'completed' ? 'border-white bg-white text-black' : 'border-white/40 hover:border-white',
                )}
              >
                {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                {task.status === 'in_progress' && <Circle className="w-3 h-3 fill-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className={clsx('text-sm font-bold uppercase tracking-tight truncate', task.status === 'completed' && 'text-white/40 line-through')}>
                    {task.title}
                  </span>
                  {priorityBadge(task.priority)}
                </div>

                {task.description && (
                  <p className="text-[11px] text-white/60 mt-2 line-clamp-2">{task.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-white/45 uppercase tracking-widest font-bold">
                  <span>Assigned: {memberLabelById(task.assigneeId)}</span>
                  {task.dueDate && (
                    <span className={clsx('inline-flex items-center gap-1', overdue ? 'text-red-300' : '')}>
                      <Calendar className="w-3 h-3" /> Due {task.dueDate}
                    </span>
                  )}
                  {overdue && <span className="inline-flex items-center gap-1 text-red-300"><AlertTriangle className="w-3 h-3" />Overdue</span>}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest pt-8 border-t border-white/10 text-center">
            No tasks match your filters
          </p>
        )}
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-black border border-white/20 w-full max-w-lg shadow-2xl">
            <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-widest">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <form onSubmit={saveTask} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Title</label>
                <input
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-transparent border border-white/20 p-3 text-xs uppercase tracking-tighter outline-none focus:border-white placeholder:text-white/20"
                  placeholder="E.G. FINISH SLIDE DECK"
                  maxLength={300}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-transparent border border-white/20 p-3 text-xs tracking-tight outline-none focus:border-white placeholder:text-white/20 min-h-[110px]"
                  placeholder="Add details, links, acceptance criteria..."
                  maxLength={10000}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-[10px] uppercase tracking-widest font-bold outline-none focus:border-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.displayName || m.email || m.id).toString()}
                      </option>
                    ))}
                    {members.length === 0 && user?.id && (
                      <option value={user.id}>{user.email || user.id}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full bg-black border border-white/20 p-3 text-[10px] uppercase tracking-widest font-bold outline-none focus:border-white"
                  >
                    <option value="todo">TODO</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="completed">COMPLETED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-black border border-white/20 p-3 text-[10px] uppercase tracking-widest font-bold outline-none focus:border-white"
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 text-[10px] uppercase tracking-widest font-bold outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => void deleteTask()}
                    className="px-6 py-3 border border-red-500/60 text-red-400 text-xs font-bold uppercase hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskModal(false);
                      setEditingTask(null);
                    }}
                    className="px-6 py-3 border border-transparent text-white text-xs font-bold uppercase hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!taskTitle.trim() || !taskAssigneeId}
                    className="px-6 py-3 border border-white bg-white text-black text-xs font-bold uppercase hover:bg-white/90 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-3 py-1 border transition-colors',
        active ? 'border-white bg-white text-black' : 'border-white/30 text-white/70 hover:border-white hover:text-white',
      )}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={clsx('border p-4 bg-white/[0.02]', danger ? 'border-red-500/40' : 'border-white/15')}>
      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{label}</div>
      <div className={clsx('text-2xl font-black mt-2', danger ? 'text-red-300' : 'text-white')}>{value}</div>
    </div>
  );
}

function AdminView({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: project, error: projectError } = await supabase.from('projects').select('*').eq('id', groupId).single();
    if (!projectError && project) setGroupName(project.name);

    const { data, error } = await supabase
      .from('memberships')
      .select('user_id, role, users(id, email, display_name)')
      .eq('project_id', groupId);
    if (error) throw error;
    setMembers(
      (data || []).map((m: any) => ({
        id: m.user_id,
        role: m.role,
        displayName: m.users?.display_name,
        email: m.users?.email,
      })),
    );
  };

  useEffect(() => {
    void load().catch(console.error);
  }, [groupId]);

  const saveGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('projects').update({ name: groupName.trim() }).eq('id', groupId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const setRole = async (memberId: string, role: 'owner' | 'member') => {
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ role })
        .eq('project_id', groupId)
        .eq('user_id', memberId);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('project_id', groupId)
        .eq('user_id', memberId);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="font-sans space-y-10">
      <form onSubmit={saveGroupName} className="border border-white/20 p-6 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Group Settings</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Owner controls</p>
          </div>
          <button
            type="submit"
            disabled={!groupName.trim() || saving}
            className="px-6 py-3 border border-white bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Group Name</label>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full bg-transparent border border-white/20 p-3 text-xs uppercase tracking-tighter outline-none focus:border-white placeholder:text-white/20"
          maxLength={100}
        />
      </form>

      <div className="border border-white/20 p-6 bg-white/[0.02]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">Members</h3>
        <div className="space-y-3">
          {members.map((m) => {
            const isSelf = m.id === user?.id;
            return (
              <div key={m.id} className="border border-white/10 p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-tight truncate">{m.displayName || m.email || m.id}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest truncate">
                    {m.email || m.id} · Role: {m.role}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    disabled={m.role === 'owner'}
                    onClick={() => void setRole(m.id, 'owner')}
                    className="px-4 py-2 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
                  >
                    Make Owner
                  </button>
                  <button
                    type="button"
                    disabled={m.role === 'member'}
                    onClick={() => void setRole(m.id, 'member')}
                    className="px-4 py-2 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
                  >
                    Make Member
                  </button>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => void removeMember(m.id)}
                    className="px-4 py-2 border border-red-500/60 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    title={isSelf ? 'You cannot remove yourself' : 'Remove member'}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {members.length === 0 && <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">No members found.</p>}
        </div>
      </div>
    </div>
  );
}

function ChatView({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const load = async () => {
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', groupId)
      .order('created_at', { ascending: true });
    if (msgError) throw msgError;
    setMessages((msgData || []).map((m: any) => ({ id: m.id, text: m.text, senderId: m.sender_id, createdAt: m.created_at })));

    const { data: memberData, error: memberError } = await supabase
      .from('memberships')
      .select('user_id, role, users(id, email, display_name)')
      .eq('project_id', groupId);
    if (memberError) throw memberError;
    setMembers(
      (memberData || []).map((m: any) => ({ id: m.user_id, role: m.role, displayName: m.users?.display_name, email: m.users?.email })),
    );
  };

  useEffect(() => {
    void load().catch(console.error);
  }, [groupId]);

  const senderLabel = (id: string) => members.find((m) => m.id === id)?.displayName || members.find((m) => m.id === id)?.email || 'Teammate';

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const msgId = uuidv4();
    const { error } = await supabase.from('messages').insert({
      id: msgId,
      project_id: groupId,
      text: newMessage.trim(),
      sender_id: user.id,
    });
    if (error) {
      console.error(error);
      return;
    }
    setNewMessage('');
    await load().catch(console.error);
  };

  return (
    <div className="flex flex-col h-[65vh] border border-white/20 bg-white/[0.01] overflow-hidden font-sans">
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {messages.map((msg) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={clsx('flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {isMine ? 'You' : senderLabel(msg.senderId)} · {formatTimestamp(msg.createdAt)}
              </span>
              <div className={clsx('px-4 py-3 text-xs max-w-[85%]', isMine ? 'bg-white text-black font-medium' : 'border border-white/20')}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest text-center mt-auto mb-auto">Start the communication</p>
        )}
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t border-white/20 bg-black flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="SEND MESSAGE..."
          className="flex-1 bg-transparent border border-white/20 px-4 py-3 focus:border-white outline-none text-[10px] uppercase font-bold tracking-widest placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-6 border border-white bg-white text-black font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function DocsView({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [docs, setDocs] = useState<LinkedDoc[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data, error: err } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', groupId)
      .order('created_at', { ascending: false });
    if (err) throw err;
    setDocs((data || []).map((d: any) => ({ id: d.id, title: d.title, url: d.url, createdBy: d.created_by, createdAt: d.created_at })));
  };

  useEffect(() => {
    void load().catch(console.error);
  }, [groupId]);

  const addDocLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !url.trim() || !user) return;
    if (!/^https:\/\//i.test(url.trim())) {
      setError('Only HTTPS links are allowed.');
      return;
    }
    const docId = uuidv4();
    const { error: err } = await supabase.from('documents').insert({
      id: docId,
      project_id: groupId,
      title: title.trim(),
      url: url.trim(),
      created_by: user.id,
    });
    if (err) {
      console.error(err);
      return;
    }
    setTitle('');
    setUrl('');
    await load().catch(console.error);
  };

  const removeDoc = async (docId: string) => {
    const { error: err } = await supabase.from('documents').delete().eq('id', docId);
    if (err) console.error(err);
    await load().catch(console.error);
  };

  return (
    <div className="font-sans">
      <form onSubmit={addDocLink} className="mb-10 flex flex-col md:flex-row gap-4 border border-white/20 p-6 bg-white/[0.02]">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="TITLE (E.G. SPECS)"
          className="flex-1 bg-transparent border border-white/20 px-4 py-3 text-[10px] uppercase font-bold tracking-widest focus:border-white outline-none placeholder:text-white/30"
        />
        <div className="flex flex-1 gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (HTTPS://...)"
            className="flex-1 bg-transparent border border-white/20 px-4 py-3 text-[10px] uppercase font-bold tracking-widest focus:border-white outline-none placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={!title.trim() || !url.trim()}
            className="px-6 py-3 border border-white bg-white text-black font-bold text-[10px] uppercase transition-colors hover:bg-black hover:text-white disabled:opacity-50 shrink-0"
          >
            Link
          </button>
        </div>
      </form>

      {error && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-4">{error}</p>}

      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/20 mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Linked Items</h3>
        </div>
        <ul className="space-y-4">
          {docs.map((item) => {
            const canDelete = item.createdBy === user?.id;
            return (
              <li key={item.id} className="flex items-center gap-3 border border-white/10 p-4">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group min-w-0 flex-1">
                  <div className="w-2 h-2 bg-white flex-shrink-0 group-hover:scale-150 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-tight group-hover:underline truncate">{item.title}</span>
                  <span className="text-[10px] text-white/30 truncate ml-auto">{item.url}</span>
                </a>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void removeDoc(item.id)}
                    className="p-2 border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {docs.length === 0 && <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-8">No documents linked.</p>}
      </div>
    </div>
  );
}

