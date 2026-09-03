import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCgSU4zxaz6nXded49pqGs5l7-rLkem5g0",
  authDomain: "manifest-cdb07.firebaseapp.com",
  projectId: "manifest-cdb07",
  storageBucket: "manifest-cdb07.firebasestorage.app",
  messagingSenderId: "672468972828",
  appId: "1:672468972828:web:bd5bc50a3d350f2fc036d9",
  measurementId: "G-9J2M2BNJQ9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// ── Auth Helpers ─────────────────────────────────────
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // If popup blocked, could try redirect as fallback
    console.error('Google sign-in failed:', error);
    return null;
  }
}

export async function signUpWithEmail(email: string, pass: string): Promise<User | null> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-up failed:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, pass: string): Promise<User | null> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-in failed:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ── Firestore Helpers ────────────────────────────────
function getUserCollection(uid: string, collectionName: string) {
  return collection(firestore, 'users', uid, collectionName);
}

function getUserDoc(uid: string, collectionName: string, docId: string) {
  return doc(firestore, 'users', uid, collectionName, docId);
}

// ── Cloud CRUD ───────────────────────────────────────
export async function cloudPut(uid: string, collectionName: string, id: string, data: Record<string, any>) {
  const docRef = getUserDoc(uid, collectionName, id);
  await setDoc(docRef, {
    ...data,
    _updatedAt: Date.now(),
    _syncedAt: Date.now(),
  }, { merge: true });
}

export async function cloudDelete(uid: string, collectionName: string, id: string) {
  const docRef = getUserDoc(uid, collectionName, id);
  await deleteDoc(docRef);
}

export async function cloudGetAll(uid: string, collectionName: string): Promise<Record<string, any>[]> {
  const colRef = getUserCollection(uid, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function cloudGet(uid: string, collectionName: string, id: string): Promise<Record<string, any> | null> {
  const docRef = getUserDoc(uid, collectionName, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
}

export async function cloudBatchPut(uid: string, collectionName: string, items: Record<string, any>[]) {
  // Firestore batches limited to 500 ops
  const batchSize = 450;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const chunk = items.slice(i, i + batchSize);
    for (const item of chunk) {
      const docRef = getUserDoc(uid, collectionName, item.id);
      batch.set(docRef, {
        ...item,
        _updatedAt: item.updatedAt || Date.now(),
        _syncedAt: Date.now(),
      }, { merge: true });
    }
    await batch.commit();
  }
}

// ── Mode Helpers ─────────────────────────────────────
export type AppMode = 'cloud' | 'offline' | null;

export function getAppMode(): AppMode {
  return localStorage.getItem('appMode') as AppMode;
}

export function setAppMode(mode: 'cloud' | 'offline') {
  localStorage.setItem('appMode', mode);
}

export function isCloudMode(): boolean {
  return getAppMode() === 'cloud';
}

export function isOnboarded(): boolean {
  return getAppMode() !== null;
}
