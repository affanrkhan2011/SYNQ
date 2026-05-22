import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, handleFirestoreError, OperationType } from '../lib/firebase';
import LoadingOverlay from './LoadingOverlay';
import { upsertMe } from '../lib/api';

interface UserContextType {
  user: User | null;
  loading: boolean;
  userProfile: any | null;
  dbConnecting: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, loading: true, userProfile: null, dbConnecting: true });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConnecting, setDbConnecting] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userDoc) => {
      setUser(userDoc);
      if (userDoc) {
        setDbConnecting(true);
        try {
          const names = userDoc.displayName ? userDoc.displayName.split(' ') : ['First', 'Last'];
          const firstName = names[0] || 'Unknown';
          const lastName = names.slice(1).join(' ') || 'User';
          const profilePayload = {
            email: userDoc.email || '',
            firstName,
            lastName,
            displayName: userDoc.displayName || 'Unknown User',
          };

          await upsertMe({
            email: profilePayload.email,
            displayName: profilePayload.displayName,
          });

          setUserProfile(profilePayload);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${userDoc.uid}`);
          const names = userDoc.displayName ? userDoc.displayName.split(' ') : ['First', 'Last'];
          setUserProfile({
            email: userDoc.email || '',
            firstName: names[0] || 'Unknown',
            lastName: names.slice(1).join(' ') || 'User',
            displayName: userDoc.displayName || 'Unknown User',
          });
        }
        setDbConnecting(false);
      } else {
        setUserProfile(null);
        setDbConnecting(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, userProfile, dbConnecting }}>
      <LoadingOverlay show={dbConnecting} label="Connecting to database…" />
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
