import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useUser } from '../components/AuthProvider';
import Layout from '../components/Layout';
import { Share, CheckCircle2, Circle, MessageSquare, FileText, Send, Link as LinkIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'docs'>('tasks');

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
        joinedAt: serverTimestamp()
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
      </div>

      <div className="mt-6 font-sans">
        {activeTab === 'tasks' && <TasksView groupId={groupId!} />}
        {activeTab === 'chat' && <ChatView groupId={groupId!} />}
        {activeTab === 'docs' && <DocsView groupId={groupId!} />}
      </div>
    </Layout>
  );
}

// Ensure TaskView, ChatView, DocsView have proper unique IDs for documents since Rules require explicit unique ids for updates if using doc(db, path, uuidv4()) etc.

function TasksView({ groupId }: { groupId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { user } = useUser();

  useEffect(() => {
    const q = query(collection(db, 'groups', groupId, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/tasks`));
    return () => unsubscribe();
  }, [groupId]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    try {
      const taskId = uuidv4();
      await setDoc(doc(db, 'groups', groupId, 'tasks', taskId), {
        title: newTaskTitle.trim(),
        description: '',
        assigneeId: user.uid, // assign to self by default for simplicity
        status: 'todo',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setNewTaskTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/tasks`);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      await updateDoc(doc(db, 'groups', groupId, 'tasks', task.id), {
        status: task.status === 'completed' ? 'todo' : 'completed'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}/tasks`);
    }
  };

  return (
    <div className="font-sans">
      <form onSubmit={addTask} className="mb-8 flex gap-4">
        <input 
          type="text" 
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder="New Task..."
          className="flex-1 bg-transparent border border-white/20 px-4 py-3 text-xs uppercase tracking-tighter text-white focus:border-white outline-none placeholder:text-white/30"
        />
        <button type="submit" disabled={!newTaskTitle.trim()} className="border border-white bg-white text-black px-8 py-3 text-[10px] font-bold uppercase transition-colors hover:bg-black hover:text-white disabled:opacity-50">
          Add
        </button>
      </form>
      
      <div className="flex flex-col gap-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-4 p-5 border border-white/[0.15] bg-white/[0.02] hover:border-white/40 transition-colors">
            <button 
              onClick={() => toggleTask(task)} 
              className={clsx("w-5 h-5 border flex items-center justify-center shrink-0 transition-colors", 
                task.status === 'completed' ? "border-white bg-white text-black" : "border-white/40 hover:border-white"
              )}
            >
              {task.status === 'completed' && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </button>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
               <span className={clsx("text-sm font-bold uppercase tracking-tight truncate", task.status === 'completed' && "text-white/40 line-through")}>
                 {task.title}
               </span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest pt-8 border-t border-white/10 text-center">No tasks assigned</p>}
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
