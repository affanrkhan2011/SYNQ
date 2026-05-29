import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { getSiteUrl } from '../lib/siteUrl';

export default function Login() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      const authCallbackUrl = `${getSiteUrl()}/auth/callback`;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: authCallbackUrl },
      });
    } catch (error: any) {
      console.error('Google Login failed', error);
      if (error?.message?.includes('cancel')) {
        setErrorMsg('Login was cancelled. Please try again.');
      } else {
        setErrorMsg(`Failed to sign in: ${error.message}`);
      }
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const authCallbackUrl = `${getSiteUrl()}/auth/callback`;
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authCallbackUrl },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Email auth failed', error);
      const msg = error?.message?.toLowerCase() || '';
      if (msg.includes('invalid') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setErrorMsg('Invalid email or password.');
      } else if (msg.includes('already') || msg.includes('email-already-in-use')) {
        setErrorMsg('An account already exists with this email.');
      } else if (msg.includes('password') || msg.includes('weak-password')) {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(`Authentication failed: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-4 font-sans">
      <div className="w-full max-w-sm flex flex-col border border-white/20 p-10 bg-white/[0.02]">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-1">SYNQ</h1>
          <div className="w-8 h-1 bg-white mb-4 mx-auto"></div>
          <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Project Management</p>
        </div>
        
        <div className="mb-8 flex border-b border-white/20">
          <button
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${isLogin ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
          >
            Log In
          </button>
          <button
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${!isLogin ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] uppercase tracking-widest p-3 font-bold text-center mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-white/20 text-white text-xs px-4 py-3 uppercase tracking-widest focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-white/20 text-white text-xs px-4 py-3 uppercase tracking-widest focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-white bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:hover:bg-white transition-colors py-4 px-4 font-bold text-xs uppercase tracking-widest"
            >
              {isSubmitting ? 'PLEASE WAIT...' : isLogin ? 'LOG IN WITH EMAIL' : 'SIGN UP WITH EMAIL'}
            </button>
          </form>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            type="button"
            className="w-full border border-white/20 bg-transparent hover:bg-white/5 transition-colors text-white py-4 px-4 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
