import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { useUser } from '../components/AuthProvider';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, ArrowRight, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid or just use a random string. Let's use crypto.randomUUID()
                              
export default function Dashboard() {
  const { user } = useUser();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    // Fetch memberships for this user
    const userMembershipsRef = collection(db, 'users', user.uid, 'memberships');
    const unsubscribe = onSnapshot(userMembershipsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemberships(data);
      setLoading(false);
    }, (error) => {
      if (error instanceof Error && error.message.includes('offline')) {
        console.warn('Firestore is offline. Could not load memberships.');
      } else {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/memberships`);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    try {
      const groupId = uuidv4();
      const batch = writeBatch(db);

      // Create group
      const groupRef = doc(db, 'groups', groupId);
      batch.set(groupRef, {
        name: newGroupName.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });

      // Add user to group members
      const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
      batch.set(memberRef, {
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      // Add membership pointer to user
      const userMembershipRef = doc(db, 'users', user.uid, 'memberships', groupId);
      batch.set(userMembershipRef, {
        groupId,
        groupName: newGroupName.trim(),
        joinedAt: serverTimestamp()
      });

      await batch.commit();

      setShowNewGroupModal(false);
      setNewGroupName('');
      setCreateError(null);
      navigate(`/groups/${groupId}`);
    } catch (error: any) {
       handleFirestoreError(error, OperationType.CREATE, `groups/create`);
       
       if (error?.code === 'permission-denied') {
         setCreateError('Permission denied. Please ensure your Firestore Database is created and security rules are updated.');
       } else {
         setCreateError(error?.message || 'Failed to create project.');
       }
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Projects</h1>
          <p className="text-[11px] text-white/40 uppercase tracking-widest mt-1">Manage your active workspaces and teams</p>
        </div>
        <button 
          onClick={() => setShowNewGroupModal(true)}
          className="px-6 py-3 border border-white bg-black text-white text-xs font-bold uppercase hover:bg-white hover:text-black transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-5 h-5 border border-white border-t-transparent animate-spin"></div>
        </div>
      ) : memberships.length === 0 ? (
        <div className="border border-white/20 p-12 flex flex-col items-center justify-center text-center bg-white/[0.02]">
          <div className="w-12 h-12 border border-white/20 flex items-center justify-center mb-6">
            <Plus className="w-6 h-6 text-white/40" />
          </div>
          <h3 className="font-bold text-sm uppercase mb-2">No projects yet</h3>
          <p className="text-white/50 text-xs uppercase tracking-tight max-w-xs mb-8">Get started by creating a new project workspace for your team.</p>
          <button 
            onClick={() => setShowNewGroupModal(true)}
            className="px-6 py-3 border border-white bg-black text-white text-xs font-bold uppercase hover:bg-white hover:text-black transition-colors"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships.map((membership) => (
            <Link 
              key={membership.id} 
              to={`/groups/${membership.groupId}`}
              className="border border-white/20 p-6 flex flex-col hover:border-white transition-colors group bg-white/[0.02]"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 border border-white/30 flex items-center justify-center font-bold text-xs bg-black text-white group-hover:border-white transition-colors shrink-0">
                  {membership.groupName.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-sm uppercase tracking-tight">{membership.groupName}</h3>
              </div>
              
              <div className="mt-auto flex items-center justify-between text-[10px] text-white/50 uppercase font-bold tracking-widest border-t border-white/10 pt-4">
                <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Team Space</span>
                <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-black border border-white/20 w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-widest">Create New Project</h2>
              <button 
                onClick={() => {
                  setShowNewGroupModal(false);
                  setCreateError(null);
                }} 
                className="text-white/40 hover:text-white transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6">
              {createError && (
                <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest">
                  {createError}
                </div>
              )}
              <div className="mb-8">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Project Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-transparent border border-white/20 p-3 text-xs uppercase tracking-tighter outline-none focus:border-white placeholder:text-white/20"
                  placeholder="e.g. TITAN INFRASTRUCTURE"
                  maxLength={100}
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewGroupModal(false);
                    setCreateError(null);
                  }}
                  className="px-6 py-3 border border-transparent text-white text-xs font-bold uppercase hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!newGroupName.trim()}
                  className="px-6 py-3 border border-white bg-white text-black text-xs font-bold uppercase hover:bg-white/90 disabled:opacity-50 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
