import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, serverTimestamp, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useUser } from '../components/AuthProvider';
import Layout from '../components/Layout';
import { CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export default function GroupPage() {
  const { groupId } = useParams();
  const { user, userProfile } = useUser();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<'owner' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'docs' | 'admin'>('tasks');

  // Load group and membership
  useEffect(() => {
    if (!user || !groupId) return;
    
    let unsubscribeMember: any;
    
    const loadGroup = async () => {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (!groupSnap.exists()) {
          navigate('/');
          return;
        }
        
        setGroup({ id: groupSnap.id, ...groupSnap.data() });
        
        // Listen to membership
        const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
        unsubscribeMember = onSnapshot(memberRef, (snap) => {
          setIsMember(snap.exists());
          setMemberRole((snap.data() as any)?.role || null);
          setLoading(false);
        });
        
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `groups/${groupId}`);
        setLoading(false);
      }
    };
    
    loadGroup();
    
    return () => {
      if (unsubscribeMember) unsubscribeMember();
    };
  }, [groupId, user, navigate]);

  const handleJoin = async () => {
    if (!user || !groupId || !group) return;
    try {
      const batch = writeBatch(db);
      
      const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
      batch.set(memberRef, {
        role: 'member',
        joinedAt: serverTimestamp(),
        displayName: userProfile?.displayName || user.displayName || 'User',
        email: userProfile?.email || user.email || ''
      });
      
      const userMembershipRef = doc(db, 'users', user.uid, 'memberships', groupId);
      batch.set(userMembershipRef, {
        groupId: groupId,
        groupName: group.name,
        joinedAt: serverTimestamp()
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/members`);
    }
  };

  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <Layout><div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div></div></Layout>;
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
        <div className="flex items-center justify-between w-full font-sans">
          <div>
            <h1 className="font-bold text-xl uppercase tracking-tight">{group?.name}</h1>
          </div>
          <button 
            onClick={copyInviteLink}
            className="px-6 py-2 bg-white text-black text-xs font-bold uppercase transition-colors hover:bg-white/90"
          >
            {copied ? 'Copied' : 'Share Link'}
          </button>
        </div>
      }
    >
      <div className="mb-8 border-b border-white/20 flex gap-8">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={clsx("pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2", activeTab === 'tasks' ? "border-b border-white text-white" : "border-b border-transparent text-white/50 hover:text-white")}
        >
          Tasks
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={clsx("pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2", activeTab === 'chat' ? "border-b border-white text-white" : "border-b border-transparent text-white/50 hover:text-white")}
        >
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={clsx("pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2", activeTab === 'docs' ? "border-b border-white text-white" : "border-b border-transparent text-white/50 hover:text-white")}
        >
          Documents
        </button>
        {memberRole === 'owner' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={clsx(
              "pb-4 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2",
              activeTab === 'admin'
                ? "border-b border-white text-white"
                : "border-b border-transparent text-white/50 hover:text-white"
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

// Ensure TaskView, ChatView, DocsView have proper unique IDs for documents since Rules require explicit unique ids for updates if using doc(db, path, uuidv4()) etc.

function TasksView({ groupId }: { groupId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const { user, userProfile } = useUser();

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/tasks`));
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'members'), orderBy('joinedAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => setMembers(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/members`)
    );
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (!taskAssigneeId && user?.uid) setTaskAssigneeId(user.uid);
  }, [taskAssigneeId, user?.uid]);

  const openCreateTask = () => {
    if (!user) return;
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('todo');
    setTaskAssigneeId(user.uid);
    setShowTaskModal(true);
  };

  const openEditTask = (task: any) => {
    setEditingTask(task);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskStatus(task.status || 'todo');
    setTaskAssigneeId(task.assigneeId || user?.uid || '');
    setShowTaskModal(true);
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!taskTitle.trim()) return;
    if (!taskAssigneeId) return;

    try {
      if (editingTask) {
        await updateDoc(doc(db, 'groups', groupId, 'tasks', editingTask.id), {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          assigneeId: taskAssigneeId,
          status: taskStatus
        });
      } else {
        const taskId = uuidv4();
        await setDoc(doc(db, 'groups', groupId, 'tasks', taskId), {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          assigneeId: taskAssigneeId,
          status: taskStatus,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }

      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error) {
      handleFirestoreError(error, editingTask ? OperationType.UPDATE : OperationType.CREATE, `groups/${groupId}/tasks`);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      const next =
        task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'todo';
      await updateDoc(doc(db, 'groups', groupId, 'tasks', task.id), { status: next });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}/tasks`);
    }
  };

  const deleteTask = async () => {
    if (!editingTask) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'tasks', editingTask.id));
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}/tasks`);
    }
  };

  const memberLabelById = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    return m?.displayName || m?.email || memberId;
  };

  return (
    <div className="font-sans">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Tasks</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Create, assign, and track progress</p>
        </div>
        <button
          type="button"
          onClick={openCreateTask}
          className="border border-white bg-white text-black px-8 py-3 text-[10px] font-bold uppercase transition-colors hover:bg-black hover:text-white"
        >
          New Task
        </button>
      </div>
      
      <div className="flex flex-col gap-3">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-4 p-5 border border-white/[0.15] bg-white/[0.02] hover:border-white/40 transition-colors cursor-pointer"
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
                toggleTask(task);
              }}
              type="button"
              aria-label="Change task status"
              title="Change status"
              className={clsx("w-5 h-5 border flex items-center justify-center shrink-0 transition-colors", 
                task.status === 'completed' ? "border-white bg-white text-black" : "border-white/40 hover:border-white"
              )}
            >
              {task.status === 'completed' && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              {task.status === 'in_progress' && <div className="w-2 h-2 bg-white rounded-full" />}
            </button>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
               <span className={clsx("text-sm font-bold uppercase tracking-tight truncate", task.status === 'completed' && "text-white/40 line-through")}>
                 {task.title}
               </span>
               <span className="text-[10px] text-white/40 uppercase tracking-widest truncate">
                 Assigned: {memberLabelById(task.assigneeId)}
               </span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest pt-8 border-t border-white/10 text-center">No tasks assigned</p>}
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
                ✕
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
                    {members.length === 0 && user?.uid && (
                      <option value={user.uid}>{userProfile?.displayName || user.email || user.uid}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full bg-black border border-white/20 p-3 text-[10px] uppercase tracking-widest font-bold outline-none focus:border-white"
                  >
                    <option value="todo">TODO</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="completed">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={deleteTask}
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

function AdminView({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'groups', groupId),
      (snap) => setGroupName((snap.data() as any)?.name || ''),
      (error) => handleFirestoreError(error, OperationType.GET, `groups/${groupId}`)
    );
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'members'), orderBy('joinedAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/members`)
    );
    return () => unsubscribe();
  }, [groupId]);

  const saveGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, 'groups', groupId), { name: groupName.trim() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    } finally {
      setSaving(false);
    }
  };

  const setRole = async (memberId: string, role: 'owner' | 'member') => {
    try {
      await updateDoc(doc(db, 'groups', groupId, 'members', memberId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}/members/${memberId}`);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await Promise.all([
        deleteDoc(doc(db, 'groups', groupId, 'members', memberId)),
        deleteDoc(doc(db, 'users', memberId, 'memberships', groupId))
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}/members/${memberId}`);
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
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Members</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Promote, demote, or remove</p>
          </div>
        </div>

        <div className="space-y-3">
          {members.map((m) => {
            const isSelf = m.id === user?.uid;
            return (
              <div
                key={m.id}
                className="border border-white/10 p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-tight truncate">
                    {m.displayName || m.email || m.id}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest truncate">
                    {m.email || m.id} · Role: {m.role}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    disabled={m.role === 'owner'}
                    onClick={() => setRole(m.id, 'owner')}
                    className="px-4 py-2 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
                  >
                    Make Owner
                  </button>
                  <button
                    type="button"
                    disabled={m.role === 'member'}
                    onClick={() => setRole(m.id, 'member')}
                    className="px-4 py-2 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black disabled:opacity-50 transition-colors"
                  >
                    Make Member
                  </button>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => removeMember(m.id)}
                    className="px-4 py-2 border border-red-500/60 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    title={isSelf ? 'You cannot remove yourself' : 'Remove member'}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">No members found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatView({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { user, userProfile } = useUser();

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/messages`));
    return () => unsubscribe();
  }, [groupId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    try {
      const msgId = uuidv4();
      await setDoc(doc(db, 'groups', groupId, 'messages', msgId), {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/messages`);
    }
  };

  return (
    <div className="flex flex-col h-[65vh] border border-white/20 bg-white/[0.01] overflow-hidden font-sans">
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {messages.map(msg => {
          const isMine = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={clsx("flex flex-col", isMine ? "items-end" : "items-start")}>
              <div className="flex items-end gap-2 max-w-[85%]">
                {!isMine && <div className="w-6 h-6 border border-white/30 flex items-center justify-center text-[8px] font-bold uppercase shrink-0">U</div>}
                <div className={clsx("px-4 py-3 text-xs", isMine ? "bg-white text-black font-medium" : "border border-white/20")}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest text-center mt-auto mb-auto">Start the communication</p>}
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t border-white/20 bg-black flex gap-3">
        <input 
          type="text" 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="SEND MESSAGE..."
          className="flex-1 bg-transparent border border-white/20 px-4 py-3 focus:border-white outline-none text-[10px] uppercase font-bold tracking-widest placeholder:text-white/30"
        />
        <button type="submit" disabled={!newMessage.trim()} className="px-6 border border-white bg-white text-black font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-black hover:text-white transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}

function DocsView({ groupId }: { groupId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { user } = useUser();

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'documents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDocs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/documents`));
    return () => unsubscribe();
  }, [groupId]);

  const addDocLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !user) return;
    try {
      const docId = uuidv4();
      await setDoc(doc(db, 'groups', groupId, 'documents', docId), {
        title: title.trim(),
        url: url.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setTitle('');
      setUrl('');
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/documents`);
    }
  };

  return (
    <div className="font-sans">
      <form onSubmit={addDocLink} className="mb-10 flex flex-col md:flex-row gap-4 border border-white/20 p-6 bg-white/[0.02]">
        <input 
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="TITLE (E.G. SPECS)"
          className="flex-1 bg-transparent border border-white/20 px-4 py-3 text-[10px] uppercase font-bold tracking-widest focus:border-white outline-none placeholder:text-white/30"
        />
        <div className="flex flex-1 gap-4">
          <input 
            type="url" 
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="URL (HTTPS://...)"
            className="flex-1 bg-transparent border border-white/20 px-4 py-3 text-[10px] uppercase font-bold tracking-widest focus:border-white outline-none placeholder:text-white/30"
          />
          <button type="submit" disabled={!title.trim() || !url.trim()} className="px-6 py-3 border border-white bg-white text-black font-bold text-[10px] uppercase transition-colors hover:bg-black hover:text-white disabled:opacity-50 shrink-0">
            Link
          </button>
        </div>
      </form>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/20 mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Linked Items</h3>
        </div>
        <ul className="space-y-4">
          {docs.map(doc => (
            <li key={doc.id}>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                <div className="w-2 h-2 bg-white flex-shrink-0 group-hover:scale-150 transition-transform"></div>
                <span className="text-xs font-bold uppercase tracking-tight group-hover:underline">{doc.title}</span>
                <span className="text-[10px] text-white/30 truncate max-w-[200px] ml-auto">{doc.url}</span>
              </a>
            </li>
          ))}
        </ul>
        {docs.length === 0 && <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-8">No documents linked.</p>}
      </div>
    </div>
  );
}
