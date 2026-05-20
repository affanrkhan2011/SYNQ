import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import { pingFirestore } from '../lib/firestoreConnection';

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
    let cancelled = false;

    async function ping() {
      setDbConnecting(true);
      try {
        await pingFirestore();
      } catch {
        // Swallow: offline/unreachable should not crash the app; pages already handle offline errors.
      } finally {
        if (!cancelled) setDbConnecting(false);
      }
    }

    // Initial boot ping + re-ping on reconnect / tab focus.
    void ping();
    const onOnline = () => void ping();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void ping();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userDoc) => {
      setUser(userDoc);
      if (userDoc) {
        setDbConnecting(true);
        try {
          const userRef = doc(db, 'users', userDoc.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            // Check if name consists of first and last name from displayName
            const names = userDoc.displayName ? userDoc.displayName.split(' ') : ['First', 'Last'];
            const firstName = names[0] || 'Unknown';
            const lastName = names.slice(1).join(' ') || 'User';

            const newUserData = {
              email: userDoc.email || '',
              firstName: firstName,
              lastName: lastName,
              displayName: userDoc.displayName || 'Unknown User',
              createdAt: serverTimestamp()
            };
            
            await setDoc(userRef, newUserData).catch(err => {
              if (err instanceof Error && err.message.includes('offline')) {
                console.warn('Firestore is offline. Could not save user data.');
              } else {
                handleFirestoreError(err, OperationType.CREATE, `users/${userDoc.uid}`);
              }
            });
            setUserProfile(newUserData);
          } else {
            setUserProfile(userSnap.data());
          }
        } catch (error) {
           if (error instanceof Error && error.message.includes('offline')) {
              console.warn('Firestore is offline. Proceeding with default user profile.');
              // Fallback to basic user profile based on auth data so the app still works!
              const names = userDoc.displayName ? userDoc.displayName.split(' ') : ['First', 'Last'];
              setUserProfile({
                  email: userDoc.email || '',
                  firstName: names[0] || 'Unknown',
                  lastName: names.slice(1).join(' ') || 'User',
                  displayName: userDoc.displayName || 'Unknown User',
                  isOffline: true
              });
           } else {
              handleFirestoreError(error, OperationType.GET, `users/${userDoc.uid}`);
              // Provide default profile to avoid crash
              setUserProfile({ displayName: 'User (Offline Error)' });
           }
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
