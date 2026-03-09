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
      if (!firebaseConfig.apiKey) {
        console.error('🔥 Firebase Config Missing! Check your environment variables.');
      } else {
        // Validate Storage Bucket Format
        if (!firebaseConfig.storageBucket) {
           console.error('🔥 Firebase Config Warning: Missing storageBucket');
        } else if (firebaseConfig.storageBucket.startsWith('gs://') || firebaseConfig.storageBucket.startsWith('http')) {
           console.warn('🔥 Firebase Config Warning: storageBucket should usually be just the domain (e.g. project-id.appspot.com), not a URL/URI.');
        }

        app = initializeApp(firebaseConfig);
      
      // Initialize services
      db = getFirestore(app);
      storage = getStorage(app);
      auth = getAuth(app);
      
      // 🔥 Eager Anonymous Auth Removed!
      // This was directly causing the "auth/network-request-failed" crash on boot without internet.
      // Now Auth will only be requested when the Sync screen explicitly triggers a manual network sync.
      
      // Enable offline persistence for Firestore
      enableIndexedDbPersistence(db).catch((err) => {
        // Silenced offline errors to keep logs clean
      });
    }
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  }
}

// Negocio ID - unique identifier for this business installation
export const getNegocioId = () => {
  // HARDCODED SINGLE TENANT ID
  // This simplifies connection for all devices.
  return 'cueramaro-sucursal-global';
};

export { app, db, storage, auth };
export default app;
