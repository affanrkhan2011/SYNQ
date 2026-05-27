import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAb4utSd4YnSAwttnyNQL_3YxJ5Kbp8j5s",
  authDomain: "synq-1000.firebaseapp.com",
  databaseURL: "https://synq-1000-default-rtdb.firebaseio.com",
  projectId: "synq-1000",
  storageBucket: "synq-1000.firebasestorage.app",
  messagingSenderId: "311500722408",
  appId: "1:311500722408:web:aff2f3060474bce7d1b95d",
  measurementId: "G-G56HG47R5M"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
