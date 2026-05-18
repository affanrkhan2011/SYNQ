import { ReactNode } from 'react';
import { useUser } from '../components/AuthProvider';
import { auth } from '../lib/firebase';
import { LogOut, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Layout({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const { userProfile } = useUser();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/20 hidden md:flex flex-col">
        <div className="p-8 border-b border-white/20">
          <Link to="/" className="block">
            <h1 className="text-3xl font-bold tracking-tighter uppercase leading-none">SYNQ</h1>
            <p className="text-[10px] text-white/50 mt-1 uppercase tracking-widest">Project Management</p>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-auto">
          <div className="bg-white text-black px-4 py-2 text-sm font-bold flex justify-between items-center mb-2">
            <span>PROJECTS</span>
          </div>
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white border-b border-white/10 transition-colors uppercase tracking-tight">
            <Folder className="w-4 h-4 text-white/50" />
            My Projects
          </Link>
        </nav>
        
        <div className="p-6 border-t border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
              {getInitials(userProfile?.displayName)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate uppercase">{userProfile?.email || 'User'}</p>
              <p className="text-[10px] text-white/40 uppercase">Display: {userProfile?.displayName}</p>
            </div>
            <button 
              title="Sign out"
              onClick={() => auth.signOut()}
              className="p-2 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors text-white/50 hover:text-white shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-6 border-b border-white/20 w-full md:hidden">
          <Link to="/" className="text-xl font-bold uppercase tracking-tight">SYNQ</Link>
          <button onClick={() => auth.signOut()} className="p-2 border border-white/20 text-white hover:bg-white hover:text-black transition-colors">
             <LogOut className="w-4 h-4" />
          </button>
        </header>

        {title && (
          <div className="h-20 px-8 border-b border-white/20 flex items-center justify-between bg-black sticky top-0 z-10 w-full">
            {title}
          </div>
        )}
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
