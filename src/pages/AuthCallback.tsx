import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { searchParams } = new URL(window.location.href);
      const code = searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      await supabase.auth.getSession();
      navigate('/', { replace: true });
    };
    void run();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black text-white font-sans">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
