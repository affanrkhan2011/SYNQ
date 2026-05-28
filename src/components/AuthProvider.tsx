import React, { createContext, useContext, useEffect, useState } from 'react';
import LoadingOverlay from './LoadingOverlay';
import { supabase } from '../lib/supabaseClient';
import { upsertMe } from '../lib/db';

interface UserContextType {
  user: any | null;
  loading: boolean;
  userProfile: any | null;
  dbConnecting: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  userProfile: null,
  dbConnecting: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConnecting, setDbConnecting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async (supabaseUser: any) => {
      setDbConnecting(true);
      try {
        const displayName = (supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || supabaseUser?.email || 'User') as string;

        const names = displayName.split(' ');
        const firstName = names[0] || 'Unknown';
        const lastName = names.slice(1).join(' ') || 'User';

        const profilePayload = {
          email: supabaseUser?.email || '',
          firstName,
          lastName,
          displayName,
        };

        await upsertMe({
          email: profilePayload.email,
          displayName: profilePayload.displayName,
        });

        if (!cancelled) setUserProfile(profilePayload);
      } catch (error) {
        console.error('Failed to sync user profile', error);
        if (!cancelled) setUserProfile(null);
      } finally {
        if (!cancelled) setDbConnecting(false);
      }
    };

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const supabaseUser = data.session?.user ?? null;
        if (cancelled) return;
        setUser(supabaseUser);
        if (supabaseUser) {
          await syncProfile(supabaseUser);
        } else {
          setUserProfile(null);
          setDbConnecting(false);
        }
      } catch (error) {
        console.error('Failed to initialize auth session', error);
        if (!cancelled) {
          setUser(null);
          setUserProfile(null);
          setDbConnecting(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      const supabaseUser = session?.user ?? null;
      setUser(supabaseUser);
      if (supabaseUser) {
        await syncProfile(supabaseUser);
      } else {
        setUserProfile(null);
        setDbConnecting(false);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, userProfile, dbConnecting }}>
      <LoadingOverlay show={dbConnecting} label="Connecting to database..." />
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
