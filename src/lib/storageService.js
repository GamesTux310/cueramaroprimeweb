import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { getApp, getApps } from 'firebase/app';
import { storage } from './firebase';

/* 
 * Sube una imagen (Offline-First en Base64).
 * Reemplaza a Firebase devolviendo el data URL para guardar directo en Dexie.
 * @param {File} file - El archivo a procesar.
 * @param {string} folder - Opcional.
 * @returns {Promise<string>} - String base64.
 */
export const uploadImage = async (file, folder = 'uploads') => {
  console.log(`[UploadService OFFLINE] 🚀 Guardando archivo: ${file?.name} (${file?.size} bytes)`);
  
  if (!file) {
    console.error('[UploadService OFFLINE] ❌ No file provided');
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      console.log('[UploadService OFFLINE] ✅ Base64 generado exitosamente.');
      resolve(reader.result); // Resolvemos con un data:image/... url
    };

    reader.onerror = () => {
      console.error('[UploadService OFFLINE] 💥 Error leyendo archivo.');
      reject(new Error('No se pudo procesar la imagen seleccionada.'));
    };

    reader.readAsDataURL(file);
  });
};
