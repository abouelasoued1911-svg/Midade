import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore
} from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

const firebaseConfig = rawConfig as FirebaseConfig;

/**
 * Validates if the project has actual Firebase credentials configured,
 * not empty strings or placeholders.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.length > 10 &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('YOUR_')
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : undefined;

    try {
      db = initializeFirestore(
        app,
        {
          experimentalAutoDetectLongPolling: true,
        },
        dbId
      );
    } catch {
      db = getFirestore(app, dbId);
    }

    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } else {
    console.info('MIDADE: Running in 100% offline local mode (Firebase credentials not configured).');
  }
} catch (e) {
  console.warn('MIDADE: Firebase initialization skipped, running offline mode:', e);
}

export { app, db, auth, googleProvider };

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
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo: currentAuth?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error caught: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Tests connection to Firestore gracefully.
 * Never throws uncaught errors if client is offline or network is warming up.
 */
export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  if (!isFirebaseConfigured() || !db || !auth) {
    return false;
  }

  if (!auth.currentUser) {
    return true;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (
      msg.includes('unavailable') ||
      msg.includes('the client is offline') ||
      msg.includes('failed to get document') ||
      msg.includes('permission-denied')
    ) {
      return false;
    }
    return false;
  }
}

export { onAuthStateChanged, signInWithPopup, signOut, type FirebaseUser };
