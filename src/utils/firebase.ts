import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, type Unsubscribe } from 'firebase/database';
import type { Expense, Payment } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const STATE_PATH = '/splitluride';

type FirebaseMap<T> = Record<string, T>;

// Firebase set() throws synchronously if any value in the tree is `undefined`.
// JSON round-trip strips undefined keys (e.g. `notes?: string` when omitted).
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function toFirebaseMap<T extends { id: string }>(items: T[]): FirebaseMap<T> {
  const map: FirebaseMap<T> = {};
  for (const item of items) {
    map[item.id] = stripUndefined(item);
  }
  return map;
}

// Bug fix #4: Sort by createdAt descending (newest-first) so ordering survives
// Firebase round-trips. Object.values() returns keys in Firebase key order
// (alphabetical UUID), which would scramble the chronological order.
export function fromFirebaseMap<T extends { createdAt: string }>(
  map: FirebaseMap<T> | null | undefined,
): T[] {
  if (!map) return [];
  return Object.values(map).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
}

// Bug fix #5: catch rejected promise from set() to avoid unhandled rejections.
// Bug fix #2: write a sentinel `_empty: true` when both collections are empty
// so Firebase doesn't strip the node to null (which would prevent other clients
// from learning that everything was deleted).
export function writeState(expenses: Expense[], payments: Payment[]): void {
  const payload: Record<string, unknown> = {
    expenses: toFirebaseMap(expenses),
    payments: toFirebaseMap(payments),
  };
  if (expenses.length === 0 && payments.length === 0) {
    payload._empty = true;
  }
  set(ref(db, STATE_PATH), payload).catch((err) => {
    console.error('Firebase write failed:', err);
  });
}

export function subscribeToState(
  callback: (data: { expenses: Expense[]; payments: Payment[] }) => void,
): Unsubscribe {
  return onValue(ref(db, STATE_PATH), (snapshot) => {
    const val = snapshot.val();
    // Bug fix #2 + #3: If node is null (empty DB or stripped), deliver empty
    // arrays instead of returning early. This lets the hook distinguish
    // "Firebase has no data" from "never heard from Firebase".
    if (!val) {
      callback({ expenses: [], payments: [] });
      return;
    }
    callback({
      expenses: fromFirebaseMap<Expense>(val.expenses),
      payments: fromFirebaseMap<Payment>(val.payments),
    });
  });
}

export function subscribeToConnection(callback: (connected: boolean) => void): Unsubscribe {
  return onValue(ref(db, '.info/connected'), (snapshot) => {
    callback(snapshot.val() === true);
  });
}
