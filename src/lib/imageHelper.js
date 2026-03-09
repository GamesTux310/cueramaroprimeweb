// ========================================
// Image Helper - Optimización de Imágenes
// Reduce tamaño y calidad para minimizar costos de Firebase Storage
// ========================================
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getNegocioId } from './firebase';

/**
 * Comprimir imagen antes de subir
 * @param {File} file - Archivo de imagen original
 * @param {number} maxWidth - Ancho máximo (default 800px)
 * @param {number} quality - Calidad JPEG 0-1 (default 0.6)
 * @returns {Promise<Blob>} - Imagen comprimida
 */
export async function compressImage(file, maxWidth = 600, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Redimensionar si excede el ancho máximo
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Blob JPEG comprimido
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprimir imagen y obtener Base64 (Para almacenamiento Local)
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function compressImageToBase64(file) {
  const blob = await compressImage(file, 500, 0.5); // Compresión agresiva para LocalStorage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Subir imagen a Firebase Storage
 * @param {File|Blob} file - Archivo a subir
 * @param {string} path - Ruta en Storage (ej: 'productos/123')
 * @param {boolean} compress - Comprimir antes de subir
 * @returns {Promise<string>} - URL de descarga
 */
export async function uploadToStorage(file, path, compress = true) {
  if (!storage) {
    throw new Error('Firebase Storage no configurado');
  }
  
  const negocioId = getNegocioId();
  const fullPath = `negocios/${negocioId}/${path}`;
  
  let fileToUpload = file;
  
  // Comprimir si es imagen y está habilitado
  if (compress && file.type?.startsWith('image/')) {
    fileToUpload = await compressImage(file);
  }
  
  
  const storageRef = ref(storage, fullPath);
  
  // Timeout protection (30s)
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout subiendo imagen (30s)')), 30000)
  );

  try {
    const snapshot = await Promise.race([
      uploadBytes(storageRef, fileToUpload),
      timeoutPromise
    ]);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log(`[Storage] ✓ Subido: ${fullPath}`);
    return downloadURL;
  } catch (error) {
    console.warn(`[Storage] ⚠️ Error subiendo ${path}:`, error);
    throw error;
  }
}

/**
 * Convertir Data URL a Blob para subir
 * @param {string} dataUrl - Data URL (base64)
 * @returns {Blob}
 */
export function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Subir imagen Base64 a Storage y obtener URL
 * @param {string} base64 - Imagen en Base64/Data URL
 * @param {string} path - Ruta en Storage
 * @returns {Promise<string>} - URL de descarga
 */
export async function uploadBase64ToStorage(base64, path) {
  const blob = dataURLtoBlob(base64);
  return uploadToStorage(blob, path, true);
}

/**
 * Verificar si una URL es de Firebase Storage
 * @param {string} url 
 * @returns {boolean}
 */
export function isFirebaseStorageUrl(url) {
  return url?.includes('firebasestorage.googleapis.com');
}

/**
 * Obtener tamaño de archivo en formato legible
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Estimar ahorro por compresión
 * @param {number} originalSize 
 * @param {number} compressedSize 
 * @returns {string}
 */
export function calculateSavings(originalSize, compressedSize) {
  const saved = originalSize - compressedSize;
  const percent = ((saved / originalSize) * 100).toFixed(0);
  return `${formatFileSize(saved)} ahorrados (${percent}%)`;
}

/**
 * Test function to verify storage connectivity
 */
export async function testImageUpload() {
  console.log('[Test] 🧪 Starting Storage Test...');
  try {
    const negocioId = getNegocioId();
    if (!negocioId) throw new Error('No Negocio ID found');

    // 1x1 Pixel Transparent GIF
    const testBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const path = `debug/${Date.now()}_test.gif`;
    
    console.log(`[Test] 📤 Attempting to upload to: negocios/${negocioId}/${path}`);
    
    const url = await uploadBase64ToStorage(testBase64, path);
    
    console.log('[Test] ✅ Upload successful:', url);
    return { success: true, url };
  } catch (error) {
    console.error('[Test] ❌ Upload failed:', error);
    return { success: false, error: error.message, code: error.code };
  }
}
