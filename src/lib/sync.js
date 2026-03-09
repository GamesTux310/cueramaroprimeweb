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
  Timestamp,
  onSnapshot 
} from 'firebase/firestore';

// ========================================
// Constants
// ========================================
const SYNC_DEBOUNCE_MS = 500; // Wait 500ms before syncing
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
  'notas',
  'eventos_calendario' // 🆕 Custom Events
];

// Debounce timers for each collection
const debounceTimers = {};

// Pending writes queue
const pendingWrites = new Map();

// ========================================
// Utility Functions
// ========================================
const isClient = typeof window !== 'undefined';

if (isClient) {
  window.addEventListener('beforeunload', () => {
    if (pendingWrites.size > 0) {
      // Attempt to flush synchronously-ish or at least trigger it
      // Note: syncToFirestore is async, so this might not complete.
      // Ideally we would use navigator.sendBeacon but that requires a backend endpoint, not Firestore SDK directly easily.
      // Best we can do is try to trigger immediate flushes.
      flushPendingWrites(); 
    }
  });
}

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
  // MANUAL MODE: Automatic sync disabled
  // We only sync when user clicks "Subir a la nube"
  return Promise.resolve();
  
  /* 
  // AUTOMATIC SYNC CODE (DISABLED)
  if (!isClient || !db) return Promise.resolve();
  
  const docId = String(document.id);
  const key = `${collectionName}_${docId}`;
  
  // Update local pending writes
  pendingWrites.set(key, { collectionName, document });
  
  // Clear existing timer
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }
  
  // Set new timer
  debounceTimers[key] = setTimeout(async () => {
    try {
      const docRef = getDocRef(collectionName, docId);
      if (!docRef) return;
      
      console.log(`[Sync] ☁️ Uploading ${collectionName}/${docId}...`);
      
      await setDoc(docRef, {
        ...document,
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
      }, { merge: true });
      
      // Remove from pending writes on success
      pendingWrites.delete(key);
      delete debounceTimers[key];
      
      console.log(`[Sync] ✅ Synced ${collectionName}/${docId}`);
    } catch (error) {
      console.error(`[Sync] ❌ Failed to sync ${collectionName}/${docId}:`, error);
      // Keep in pending writes to retry later
    }
  }, SYNC_DEBOUNCE_MS);
  
  return Promise.resolve();
  */
}

/**
 * Batch sync multiple documents to Firestore
 * Handles batch limit of 500 operations AND uploads local images in PARALLEL
 * @param {string} collectionName - Collection name
 * @param {array} documents - Array of documents to sync
 * @param {function} onProgress - Callback for progress updates
 */
export async function batchSyncToFirestore(collectionName, documents, onProgress = () => {}) {
  if (!isClient || !db) return;
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    console.log(`[Sync] ⚠️ Skipping empty batch for ${collectionName}`);
    return;
  }
  
  const negocioId = getNegocioId();
  if (!negocioId) {
    console.error('[Sync] ❌ Missing Negocio ID');
    return;
  }

  // Safe progress Wrapper
  const reportProgress = (msg) => {
    try { if (typeof onProgress === 'function') onProgress(msg); } catch (e) { console.warn('Progress callback failed', e); }
  };

  // =================================================================================
  // PHASE 1: PRE-PROCESS IMAGES (PARALLEL UPLOADS)
  // =================================================================================
  
  reportProgress(`Escaneando imágenes en ${collectionName}...`);

  // 1. Identify all images needing upload across ALL documents in this batch
  const imageTasks = [];
  const imageFields = ['avatarURL', 'credencialURL', 'comprobanteURL', 'otrosDocURL', 'imagenURL', 'imagenComprobante', 'adjuntoURL'];
  const { uploadBase64ToStorage } = await import('./imageHelper');

  // Map to store temporary results: { docId_field: 'url' }
  const uploadedUrls = new Map();

  documents.forEach(doc => {
    imageFields.forEach(field => {
      // Check if it's a base64 string
      if (doc[field] && typeof doc[field] === 'string' && doc[field].startsWith('data:image')) {
        imageTasks.push({
          docId: doc.id,
          field: field,
          base64: doc[field],
          path: `${collectionName}/${doc.id}/${field}_${Date.now()}.jpg`
        });
      }
    });
  });

  if (imageTasks.length > 0) {
    reportProgress(`Encontradas ${imageTasks.length} imágenes. Subiendo...`);
    console.log(`[Sync] 📸 Found ${imageTasks.length} images to upload.`);
    
    // 2. Process in chunks of 5 (Concurrency Limit)
    const CONCURRENCY = 5;
    let completed = 0;

    for (let i = 0; i < imageTasks.length; i += CONCURRENCY) {
      const chunk = imageTasks.slice(i, i + CONCURRENCY);
      
      reportProgress(`Subiendo imágenes ${completed + 1}-${Math.min(completed + chunk.length, imageTasks.length)} de ${imageTasks.length}...`);
      
      await Promise.all(chunk.map(async (task) => {
        try {
          const url = await uploadBase64ToStorage(task.base64, task.path);
          uploadedUrls.set(`${task.docId}_${task.field}`, url);
        } catch (error) {
          console.error(`[Sync] ❌ Failed to upload image for ${task.docId} (${task.field})`, error);
          uploadedUrls.set(`${task.docId}_${task.field}`, null); 
        }
      }));
      completed += chunk.length;
    }
    reportProgress(`Imágenes subidas. Guardando datos...`);
  }

  // =================================================================================
  // PHASE 2: BATCH WRITE TO FIRESTORE
  // =================================================================================

  const BATCH_SIZE = 450; 
  
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const rawChunk = documents.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    let opCount = 0;
    
    reportProgress(`Guardando lote ${Math.floor(i/BATCH_SIZE) + 1} de ${collectionName}...`);

    rawChunk.forEach(item => {
      if (!item.id) return;
      
      // Clone item to avoid mutating original state if something goes wrong
      const docToSave = { ...item };

      // Apply uploaded URLs (or nulls)
      imageFields.forEach(field => {
        const key = `${item.id}_${field}`;
        if (uploadedUrls.has(key)) {
          docToSave[field] = uploadedUrls.get(key);
        }
      });

      // Use 'doc' function from imports, 'item' from loop
      const docRef = doc(db, 'negocios', negocioId, collectionName, String(item.id));
      batch.set(docRef, {
        ...docToSave,
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
      }, { merge: true });
      opCount++;
    });

    if (opCount > 0) {
      try {
        await batch.commit();
      } catch (error) {
        throw new Error(`Error saving to Firestore: ${error.message}`);
      }
    }
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
    
    console.log(`[Sync] 📥 Reading from: ${colRef.path}`);

    // Get ALL documents (no filter) to avoid index/field issues
    let q = query(colRef);
    
    // Only apply time filter if strictly needed, but for manual full sync, getting all is safer.
    // We will rely on overwriting local data for "Descargar de la Nube".
    
    const snapshot = await getDocs(q);
    const documents = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Filter deleted docs in memory
      if (data.deleted !== true) {
        documents.push({ id: doc.id, ...data });
      }
    });
    
    console.log(`[Sync] ↓ ${collectionName}: ${documents.length} docs (from ${snapshot.size} total in cloud)`);
    return documents;
  } catch (error) {
    console.error(`[Sync] ❌ Fetch ${collectionName}:`, error);
    throw error; // Propagate error to UI
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
/**
 * Initial migration - push all localStorage data to Firestore
 */
// Helper to cleanup orphaned documents in Cloud (Mirror Sync)
async function cleanupCloudCollection(collectionName, localDocuments, onProgress) {
  if (!isClient || !db) return;
  
  try {
    const negocioId = getNegocioId();
    const colRef = collection(db, 'negocios', negocioId, collectionName);
    
    // Get ALL cloud IDs (we need to read them to know what to delete)
    // Optimization: In a huge app we would store a list of IDs, but here we read.
    const snapshot = await getDocs(colRef);
    const cloudIds = new Set();
    snapshot.forEach(doc => cloudIds.add(doc.id));
    
    const localIds = new Set(localDocuments.map(d => String(d.id)));
    
    // Find IDs that are in Cloud but NOT in Local
    const idsToDelete = [...cloudIds].filter(id => !localIds.has(id));
    
    if (idsToDelete.length > 0) {
      console.log(`[Sync] 🗑️ Deleting ${idsToDelete.length} orphaned docs from ${collectionName}`);
      if (typeof onProgress === 'function') onProgress(`Eliminando ${idsToDelete.length} borrados en ${collectionName}...`);
      
      const BATCH_SIZE = 450;
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(id => {
          const docRef = doc(db, 'negocios', negocioId, collectionName, id);
          batch.delete(docRef);
        });
        
        await batch.commit();
      }
    }
  } catch (error) {
    console.error(`[Sync] ⚠️ Cleanup failed for ${collectionName}:`, error);
    // Don't throw, just log. Syncing new data is more important.
  }
}

/**
 * Wipe ALL data from Firestore for this business
 * DANGER: This is irreversible
 */
export async function wipeCloudData(onProgress = () => {}) {
  if (!isClient || !db) return;
  
  const negocioId = getNegocioId();
  if (!negocioId) return;

  console.log('[Wipe] ⚠️ STARTING CLOUD WIPE for:', negocioId);
  if (typeof onProgress === 'function') onProgress('Iniciando borrado remoto...');

  for (const collectionName of COLLECTIONS) {
    console.log(`[Wipe] 🗑️ Cleaning collection: ${collectionName}`);
    if (typeof onProgress === 'function') onProgress(`Borrando ${collectionName} en la nube...`);

    const colRef = collection(db, 'negocios', negocioId, collectionName);
    const snapshot = await getDocs(colRef);
    
    if (!snapshot.empty) {
      const BATCH_SIZE = 450;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
      }
    }
  }
  
  // Clear migration status
  localStorage.removeItem('cueramaro_migrated_at');
  localStorage.removeItem('cueramaro_last_sync');
  
  if (typeof onProgress === 'function') onProgress('¡Nube limpiada correctamente!');
  console.log('[Wipe] ✅ CLOUD WIPE COMPLETE');
}

/**
 * Initial migration - push all localStorage data to Firestore
 * Performs a MIRROR SYNC: Uploads local data AND deletes cloud data not present locally.
 */
export async function migrateToFirestore(allData, onProgress = () => {}) {
  if (!isClient || !db) return;
  
  console.log('[Migration] 🚀 Starting migration...');
  if (typeof onProgress === 'function') onProgress('Iniciando migración...');
  console.log('[Migration] 📦 Input Data Keys:', Object.keys(allData));
  
  for (const [collectionName, documents] of Object.entries(allData)) {
    console.log(`[Migration] 🔍 Checking ${collectionName}... Count: ${documents?.length || 0}`);
    if (Array.isArray(documents)) {
      // 1. Upload/Update Local Data
      if (documents.length > 0) {
         // Add timestamps to documents
        const docsWithTimestamps = documents.map(doc => ({
          ...doc,
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: doc.updatedAt || new Date().toISOString(),
        }));
        
        await batchSyncToFirestore(collectionName, docsWithTimestamps, onProgress);
      }
      
      // 2. Delete Remote Data not in Local (Mirroring)
      await cleanupCloudCollection(collectionName, documents, onProgress);
    }
  }
  
  // Save migration timestamp
  localStorage.setItem('cueramaro_migrated_at', new Date().toISOString());
  if (typeof onProgress === 'function') onProgress('¡Sincronización completada!');
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
 * Create a local backup in localStorage (Now IndexedDB via localforage)
 */
export async function createLocalBackup(allData) {
  if (!isClient) return;
  
  const backup = {
    timestamp: new Date().toISOString(),
    data: allData,
  };
  
  try {
    localStorage.setItem('cueramaro_backup', JSON.stringify(backup));
    console.log('[Backup] ✓ Local backup created');
  } catch(e) {
    console.warn("Storage quota exceeded for local backup, downloading instead.");
    downloadBackup(allData);
  }
}

/**
 * Get last local backup
 */
export async function getLocalBackup() {
  if (!isClient) return null;
  
  try {
    const backup = localStorage.getItem('cueramaro_backup');
    return backup ? JSON.parse(backup) : null;
  } catch(e) {
    return null;
  }
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

// ========================================
// Real-time Listeners
// ========================================

/**
 * Setup real-time listeners for all collections
 * Updates localStorage and dispatches 'storage' event
 */
export function setupRealtimeSync() {
  if (!isClient || !db) return () => {};
  
  // MANUAL MODE: Automatic sync disabled
  console.log('[Sync] ⏸️ Real-time sync is disabled (Manual Mode)');
  return () => {};

  /* 
  // AUTOMATIC SYNC CODE (DISABLED)
  console.log('[Sync] 📡 Starting Real-time Sync...');
  const unsubscribes = [];
  const negocioId = getNegocioId();

  if (!negocioId) return () => {};

  COLLECTIONS.forEach(collectionName => {
    const colRef = collection(db, 'negocios', negocioId, collectionName);
    // Listen to changes
    const unsub = onSnapshot(colRef, (snapshot) => {
      // Optimization: If snapshot is empty, do nothing
      if (snapshot.empty && snapshot.docChanges().length === 0) return;
      
      // Determine LocalStorage Key
      let storageKey = '';
      switch (collectionName) {
        case 'eventos_calendario': storageKey = 'cueramaro_eventos_calendario'; break;
        default: storageKey = `cueramaro_${collectionName}`; break;
      }
      
      // 1. Read current local data to preserve un-synced changes or just rely on cloud truth?
      // "Cloud Truth" approach is safer for synchronization, but we need to handle "offline writes".
      // Since we have `syncToFirestore` dealing with writes, we can assume Cloud is generally ahead 
      // or at least concurrent.
      
      // However, simplified approach:
      // We read ALL docs from snapshot, filter out deleted, and save to LocalStorage.
      // This might overwrite local un-synced changes if we are not careful.
      // But since `syncToFirestore` is optimistic, it pushes immediately.
      
      const docs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.deleted) {
          docs.push({ id: doc.id, ...data });
        }
      });
      
      // Check if data actually changed to avoid tight loops
      const currentLocal = localStorage.getItem(storageKey);
      const newJson = JSON.stringify(docs);
      
      if (currentLocal !== newJson) {
        console.log(`[Sync] 📥 Received update for ${collectionName}: ${docs.length} items`);
        localStorage.setItem(storageKey, newJson);
        
        // Dispatch event for UI
        window.dispatchEvent(new Event('cueramaro_data_updated'));
      }
    }, (error) => {
      console.error(`[Sync] ⚠️ Listener error for ${collectionName}:`, error);
    });
    
    unsubscribes.push(unsub);
  });

  return () => {
    console.log('[Sync] 🛑 Stopping Real-time Sync');
    unsubscribes.forEach(unsub => unsub());
  };
  */
}
