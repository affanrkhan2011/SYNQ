import React, { useEffect, useState } from 'react';
import { auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { useUser } from '../components/AuthProvider';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, ArrowRight, X, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid or just use a random string. Let's use crypto.randomUUID()
import { createProject, listProjects } from '../lib/api';
                              
export default function Dashboard() {
  const { user, userProfile } = useUser();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const loadMemberships = async () => {
      try {
        setLoading(true);
        const data = await listProjects();
        setMemberships(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/memberships`);
      } finally {
        setLoading(false);
      }
    };

    void loadMemberships();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;

    setCreateError(null);
    setIsCreating(true);

    try {
      const projectId = uuidv4();
      const created = await createProject({
        id: projectId,
        name: newProjectName.trim(),
        displayName: userProfile?.displayName || user.displayName || 'User',
        email: userProfile?.email || user.email || '',
      });

      setMemberships((prev) => [
        {
          id: created.groupId,
          groupId: created.groupId,
          groupName: created.groupName,
        },
        ...prev,
      ]);

      // Close the modal and reset form
      setShowNewProjectModal(false);
      setNewProjectName('');
      setCreateError(null);
      
      // Brief delay to ensure modal close is rendered before navigation
      setTimeout(() => {
        setIsCreating(false);
        // Using `replace` avoids leaving the modal page state in history.
        navigate(`/groups/${created.groupId}`, { replace: true });
      }, 100);
    } catch (error: any) {
      setIsCreating(false);
      handleFirestoreError(error, OperationType.CREATE, `groups/create`);
      if (error?.code === 'permission-denied') {
        setCreateError('Permission denied. Please ensure your Firestore Database is created and security rules are updated.');
      } else {
        setCreateError(error?.message || 'Failed to create project.');
      }
    }
  };

  const filteredMemberships = memberships.filter((membership) =>
    membership.groupName?.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Projects</h1>
          <p className="text-[11px] text-white/40 uppercase tracking-widest mt-1">Manage your active workspaces and teams</p>
        </div>
        <button 
          onClick={() => setShowNewProjectModal(true)}
          className="px-6 py-3 border border-white bg-black text-white text-xs font-bold uppercase hover:bg-white hover:text-black transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-white/20 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Total Projects</p>
          <p className="text-3xl font-black mt-2">{memberships.length}</p>
        </div>
        <div className="border border-white/20 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Team Presence</p>
          <p className="text-sm uppercase mt-3">{userProfile?.displayName || user?.email || 'User'}</p>
        </div>
        <div className="border border-white/20 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Quick Tip</p>
          <p className="text-xs text-white/70 mt-3">Use project share links to onboard teammates instantly.</p>
        </div>
      </div>

      <div className="mb-8 relative">
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects"
          className="w-full bg-transparent border border-white/20 pl-9 pr-3 py-3 text-xs uppercase tracking-widest focus:border-white outline-none"
        />
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
            onClick={() => setShowNewProjectModal(true)}
            className="px-6 py-3 border border-white bg-black text-white text-xs font-bold uppercase hover:bg-white hover:text-black transition-colors"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemberships.map((membership) => (
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
          {filteredMemberships.length === 0 && (
            <div className="col-span-full border border-white/20 p-8 text-center text-white/50 text-xs uppercase tracking-widest">
              No projects match your search.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-black border border-white/20 w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-widest">Create New Project</h2>
              <button 
                onClick={() => {
                  setShowNewProjectModal(false);
                  setCreateError(null);
                }} 
                className="text-white/40 hover:text-white transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6">
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
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full bg-transparent border border-white/20 p-3 text-xs uppercase tracking-tighter outline-none focus:border-white placeholder:text-white/20"
                  placeholder="e.g. TITAN INFRASTRUCTURE"
                  maxLength={100}
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setCreateError(null);
                  }}
                  className="px-6 py-3 border border-transparent text-white text-xs font-bold uppercase hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!newProjectName.trim() || isCreating}
                  className="px-6 py-3 border border-white bg-white text-black text-xs font-bold uppercase hover:bg-white/90 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
