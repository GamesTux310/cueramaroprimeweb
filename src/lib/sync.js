// ========================================
// Firebase Sync Layer
// Hybrid Storage: localStorage (cache) + Firestore (persistence)
// ========================================
import { db, getNegocioId } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  writeBatch,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// ========================================
// Constants
// ========================================
const SYNC_DEBOUNCE_MS = 2000; // Wait 2s before syncing to reduce writes
const COLLECTIONS = [
  'clientes',
  'productos', 
  'proveedores',
  'ventas',
  'compras',
  'lotes',
  'gastos',
  'abonos',
  'facturas',
  'notas'
];

// Debounce timers for each collection
const debounceTimers = {};

// Pending writes queue
const pendingWrites = new Map();

// ========================================
// Utility Functions
// ========================================
const isClient = typeof window !== 'undefined';

/**
 * Get collection reference for this business
 */
export function getCollectionRef(collectionName) {
  if (!db) return null;
  const negocioId = getNegocioId();
  return collection(db, 'negocios', negocioId, collectionName);
}

/**
 * Get document reference
 */
export function getDocRef(collectionName, docId) {
  if (!db) return null;
  const negocioId = getNegocioId();
  return doc(db, 'negocios', negocioId, collectionName, String(docId));
}

// ========================================
// Sync to Firestore (Write)
// ========================================

/**
 * Sync a single document to Firestore with debounce
 * @param {string} collectionName - Collection name
 * @param {object} document - Document to sync
 */
export function syncToFirestore(collectionName, document) {
  if (!isClient || !db) return Promise.resolve();
  
  const docId = String(document.id);
  const key = `${collectionName}:${docId}`;
  
  // Add to pending writes
  pendingWrites.set(key, { collectionName, document });
  
  // Clear existing timer
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }
  
  // Set new debounced timer
  return new Promise((resolve, reject) => {
    debounceTimers[key] = setTimeout(async () => {
      try {
        const docRef = getDocRef(collectionName, docId);
        if (!docRef) return resolve();
        
        // Add sync metadata
        const syncedDoc = {
          ...document,
          updatedAt: serverTimestamp(),
          syncedAt: serverTimestamp(),
        };
        
        await setDoc(docRef, syncedDoc, { merge: true });
        pendingWrites.delete(key);
        console.log(`[Sync] ✓ ${collectionName}/${docId}`);
        resolve();
      } catch (error) {
        console.error(`[Sync] ✗ ${collectionName}/${docId}:`, error);
        reject(error);
      }
    }, SYNC_DEBOUNCE_MS);
  });
}

/**
 * Batch sync multiple documents to Firestore
 * @param {string} collectionName - Collection name
 * @param {array} documents - Array of documents to sync
 */
export async function batchSyncToFirestore(collectionName, documents) {
  if (!isClient || !db || !documents.length) return;
  
  const batch = writeBatch(db);
  const negocioId = getNegocioId();
  
  documents.forEach(document => {
    const docRef = doc(db, 'negocios', negocioId, collectionName, String(document.id));
    batch.set(docRef, {
      ...document,
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
    }, { merge: true });
  });
  
  try {
    await batch.commit();
    console.log(`[Sync] ✓ Batch ${collectionName}: ${documents.length} docs`);
  } catch (error) {
    console.error(`[Sync] ✗ Batch ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Mark document as deleted (soft delete)
 */
export async function softDeleteFromFirestore(collectionName, docId) {
  if (!isClient || !db) return;
  
  try {
    const docRef = getDocRef(collectionName, docId);
    if (!docRef) return;
    
    await setDoc(docRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log(`[Sync] ✓ Deleted ${collectionName}/${docId}`);
  } catch (error) {
    console.error(`[Sync] ✗ Delete ${collectionName}/${docId}:`, error);
  }
}

// ========================================
// Sync from Firestore (Read)
// ========================================

/**
 * Get all documents from a Firestore collection
 * Only fetches non-deleted documents updated after lastSync
 */
export async function syncFromFirestore(collectionName, lastSyncTime = null) {
  if (!isClient || !db) return [];
  
  try {
    const colRef = getCollectionRef(collectionName);
    if (!colRef) return [];
    
    let q = query(colRef, where('deleted', '!=', true));
    
    // If lastSyncTime provided, only fetch newer documents
    if (lastSyncTime) {
      const timestamp = Timestamp.fromDate(new Date(lastSyncTime));
      q = query(colRef, 
        where('deleted', '!=', true),
        where('updatedAt', '>', timestamp)
      );
    }
    
    const snapshot = await getDocs(q);
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`[Sync] ↓ ${collectionName}: ${documents.length} docs`);
    return documents;
  } catch (error) {
    console.error(`[Sync] ✗ Fetch ${collectionName}:`, error);
    return [];
  }
}

/**
 * Full sync - download all collections from Firestore
 */
export async function fullSyncFromFirestore() {
  if (!isClient || !db) return null;
  
  const result = {};
  
  for (const collectionName of COLLECTIONS) {
    result[collectionName] = await syncFromFirestore(collectionName);
  }
  
  // Save last sync time
  localStorage.setItem('cueramaro_last_sync', new Date().toISOString());
  
  return result;
}

/**
 * Initial migration - push all localStorage data to Firestore
 */
export async function migrateToFirestore(allData) {
  if (!isClient || !db) return;
  
  console.log('[Migration] Starting full migration to Firestore...');
  
  for (const [collectionName, documents] of Object.entries(allData)) {
    if (Array.isArray(documents) && documents.length > 0) {
      // Add timestamps to documents
      const docsWithTimestamps = documents.map(doc => ({
        ...doc,
        createdAt: doc.createdAt || new Date().toISOString(),
        updatedAt: doc.updatedAt || new Date().toISOString(),
      }));
      
      await batchSyncToFirestore(collectionName, docsWithTimestamps);
    }
  }
  
  // Save migration timestamp
  localStorage.setItem('cueramaro_migrated_at', new Date().toISOString());
  console.log('[Migration] ✓ Complete!');
}

// ========================================
// Sync Status
// ========================================

/**
 * Check if there are pending writes
 */
export function hasPendingWrites() {
  return pendingWrites.size > 0;
}

/**
 * Get pending writes count
 */
export function getPendingWritesCount() {
  return pendingWrites.size;
}

/**
 * Get last sync time
 */
export function getLastSyncTime() {
  if (!isClient) return null;
  return localStorage.getItem('cueramaro_last_sync');
}

/**
 * Check if migration has been done
 */
export function isMigrated() {
  if (!isClient) return false;
  return !!localStorage.getItem('cueramaro_migrated_at');
}

/**
 * Force flush all pending writes immediately
 */
export async function flushPendingWrites() {
  const promises = [];
  
  for (const [key, { collectionName, document }] of pendingWrites.entries()) {
    // Clear debounce timer
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
    }
    
    // Sync immediately
    const docRef = getDocRef(collectionName, document.id);
    if (docRef) {
      promises.push(
        setDoc(docRef, {
          ...document,
          updatedAt: serverTimestamp(),
          syncedAt: serverTimestamp(),
        }, { merge: true })
      );
    }
  }
  
  await Promise.all(promises);
  pendingWrites.clear();
  console.log('[Sync] ✓ Flushed all pending writes');
}

// ========================================
// Local Backup
// ========================================

/**
 * Create a local backup in localStorage
 */
export function createLocalBackup(allData) {
  if (!isClient) return;
  
  const backup = {
    timestamp: new Date().toISOString(),
    data: allData,
  };
  
  localStorage.setItem('cueramaro_backup', JSON.stringify(backup));
  console.log('[Backup] ✓ Local backup created');
}

/**
 * Get last local backup
 */
export function getLocalBackup() {
  if (!isClient) return null;
  
  const backup = localStorage.getItem('cueramaro_backup');
  return backup ? JSON.parse(backup) : null;
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(allData) {
  if (!isClient) return;
  
  const backup = {
    exportedAt: new Date().toISOString(),
    negocioId: getNegocioId(),
    data: allData,
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cueramaro_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========================================
// Connection Status
// ========================================

/**
 * Check if online
 */
export function isOnline() {
  if (!isClient) return true;
  return navigator.onLine;
}

/**
 * Listen for online/offline changes
 */
export function onConnectionChange(callback) {
  if (!isClient) return () => {};
  
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
