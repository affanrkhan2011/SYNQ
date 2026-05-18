import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAb4utSd4YnSAwttnyNQL_3YxJ5Kbp8j5s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "synq-1000.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "synq-1000",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "synq-1000.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "311500722408",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:311500722408:web:aff2f3060474bce7d1b95d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-G56HG47R5M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Test connectivity
import { doc, getDocFromServer } from 'firebase/firestore';
getDocFromServer(doc(db, 'test', 'connection')).catch(err => {
  if (err instanceof Error && err.message.includes('offline')) {
    console.error('Firestore offline error');
  }
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
