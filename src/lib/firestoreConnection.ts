import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Best-effort ping. The doc does not need to exist; we only care that Firestore can be reached.
export async function pingFirestore({ timeoutMs = 8000 }: { timeoutMs?: number } = {}) {
  await withTimeout(getDocFromServer(doc(db, '_meta', 'ping')), timeoutMs);
}

