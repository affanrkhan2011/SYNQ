import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // supabase-js parses the URL hash/query and persists the session.
      // Calling getSession forces hydration from the callback URL.
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

