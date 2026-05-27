import React, { createContext, useContext, useEffect, useState } from 'react';
import LoadingOverlay from './LoadingOverlay';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { upsertMe } from '../lib/db';

interface UserContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConnecting, setDbConnecting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncProfile = async (firebaseUser: User) => {
      setDbConnecting(true);
      try {
        const displayName = (firebaseUser.displayName || firebaseUser.email || 'User') as string;

        const names = displayName.split(' ');
        const firstName = names[0] || 'Unknown';
        const lastName = names.slice(1).join(' ') || 'User';

        const profilePayload = {
          email: firebaseUser.email || '',
          firstName,
          lastName,
          displayName,
        };

        await upsertMe({
          email: profilePayload.email,
          displayName: profilePayload.displayName,
        });

        if (!cancelled) setUserProfile(profilePayload);
      } finally {
        if (!cancelled) setDbConnecting(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncProfile(firebaseUser);
      } else {
        setUserProfile(null);
        setDbConnecting(false);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
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

