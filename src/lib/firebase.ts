import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, collection, doc, writeBatch, onSnapshot, query, setDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import firebaseConfig_raw from '../../firebase-applet-config.json';

// Cast firebaseConfig to any to avoid TypeScript complaining if properties are checked dynamically
const firebaseConfig = firebaseConfig_raw as any;

const app = initializeApp(firebaseConfig);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true
  }, firebaseConfig.firestoreDatabaseId);
  console.log("Firestore initialized successfully with persistent multi-tab cache and forced long-polling.");
} catch (error) {
  console.warn("Firestore persistent cache failed to initialize (this is normal in some sandbox iframes). Falling back to memory-only storage with forced long-polling:", error);
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = dbInstance;
export const auth = getAuth();

export const COLLECTIONS = {
  TEAMS: 'teams',
  MATCHES: 'matches',
  PRESENCE: 'presence'
};

// Error handling helper as per skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We throw it so the caller can catch it and show a UI alert
  throw new Error(JSON.stringify(errInfo));
}
