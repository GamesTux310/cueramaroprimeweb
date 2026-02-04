// ========================================
// Firebase Configuration
// ========================================
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (only once)
let app;
let db;
let storage;
let auth;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    
    // Initialize services
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    
    // Enable offline persistence for Firestore
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistence not supported by browser');
      }
    });
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  }
}

// Negocio ID - unique identifier for this business installation
export const getNegocioId = () => {
  if (typeof window === 'undefined') return null;
  
  let negocioId = localStorage.getItem('cueramaro_negocio_id');
  if (!negocioId) {
    negocioId = crypto.randomUUID();
    localStorage.setItem('cueramaro_negocio_id', negocioId);
  }
  return negocioId;
};

export { app, db, storage, auth };
export default app;
