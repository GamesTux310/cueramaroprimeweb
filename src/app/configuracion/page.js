'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './configuracion.module.css';
import { 
  getClientes, 
  getProductos, 
  getProveedores, 
  getVentas, 
  getGastos, 
  getAbonos, 
  getFacturas, 
  getNotas,
  getCompras,
  getLotes,
  exportarDatos,
  importarDatos,
  resetearDatos
} from '@/lib/storage';
import { 
  migrateToFirestore, 
  fullSyncFromFirestore,
  downloadBackup,
  createLocalBackup,
  getLocalBackup
} from '@/lib/sync';
import { getNegocioId } from '@/lib/firebase';
import RescueDB from '@/components/RescueDB';

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [stats, setStats] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [lastBackup, setLastBackup] = useState(null);
  const [currentNegocioId, setCurrentNegocioId] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    // Cargar estadísticas
    updateStats();
    
    // Verificar último backup de forma asíncrona
    const cargarBackup = async () => {
      const backup = await getLocalBackup();
      if (backup?.timestamp) {
        setLastBackup(new Date(backup.timestamp).toLocaleString('es-MX'));
      }
    };
    cargarBackup();

    // Cargar ID de Negocio
    const id = localStorage.getItem('cueramaro_negocio_id');
    setCurrentNegocioId(id || 'No asignado');
  }, []);

  const updateStats = async () => {
    setStats({
      clientes: (await getClientes()).length,
      productos: (await getProductos()).length,
      proveedores: (await getProveedores()).length,
      ventas: (await getVentas()).length,
      gastos: (await getGastos()).length,
      abonos: (await getAbonos()).length,
      facturas: (await getFacturas()).length,
      notas: (await getNotas()).length,
      compras: (await getCompras()).length,
      lotes: (await getLotes()).length,
    });
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // ========================================
  // RESPALDO LOCAL
  // ========================================
  const handleDescargarRespaldo = async () => {
    try {
      const datos = await exportarDatos();
      downloadBackup(datos);
      showMessage('✅ Respaldo descargado correctamente');
    } catch (error) {
      showMessage('❌ Error al descargar respaldo: ' + error.message, 'error');
    }
  };

  const handleCrearBackupLocal = async () => {
    try {
      const datos = await exportarDatos();
      await createLocalBackup(datos);
      setLastBackup(new Date().toLocaleString('es-MX'));
      showMessage('✅ Backup local creado');
    } catch (error) {
      showMessage('❌ Error al crear backup: ' + error.message, 'error');
    }
  };

  const handleRestaurarRespaldo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        
        if (backup.data) {
          await importarDatos(backup.data);
        } else {
          await importarDatos(backup);
        }
        
        await updateStats();
        showMessage('✅ Datos restaurados correctamente');
      } catch (error) {
        showMessage('❌ Error al restaurar: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // ========================================
  // SINCRONIZACIÓN NUBE
  // ========================================
  // ========================================
  // SINCRONIZACIÓN NUBE
  // ========================================
  const handleSubirNube = async () => {
    if (!confirm('¿Estás seguro de subir tus datos a la nube? Esto sobrescribirá el respaldo anterior.')) return;
    
    setLoading(true);
    try {
      // Recopilar todos los datos locales
      const allData = {
        clientes: await getClientes(),
        productos: await getProductos(),
        proveedores: await getProveedores(),
        ventas: await getVentas(),
        gastos: await getGastos(),
        abonos: await getAbonos(),
        facturas: await getFacturas(),
        notas: await getNotas(),
        compras: await getCompras(),
        lotes: await getLotes(),
      };

      // 🔍 DEBUG: Verificar qué se está enviando
      console.group('🔍 DEBUG DE SUBIDA');
      console.log('📦 Objeto de datos completo:', allData);
      const debugTable = Object.entries(allData).map(([key, arr]) => ({
        Categoria: key,
        Cantidad: arr.length,
        'Tiene Datos': arr.length > 0 ? '✅ SI' : '❌ NO',
        'Ejemplo (ID)': arr.length > 0 ? arr[0].id : '-'
      }));
      console.table(debugTable);
      console.groupEnd();

      if (Object.values(allData).every(arr => arr.length === 0)) {
        console.warn('⚠️ Alerta: Intentando subir objeto con 0 datos en total.');
        if (!confirm('⚠️ ALERTA: Parece que no hay datos locales para subir (todo está vacío). ¿Seguro que quieres continuar?')) {
          setLoading(false);
          return;
        }
      }

      console.log('📤 Iniciando subida manual...', allData);
      
      // 1. Sanitize Data (Safety Check for Legacy Data)
      const sanitizedData = {};
      Object.entries(allData).forEach(([key, arr]) => {
        if (Array.isArray(arr)) {
          sanitizedData[key] = arr.filter(item => {
            // Must have ID and be an object
            return item && typeof item === 'object' && (item.id || item.id === 0);
          }).map(item => {
            // Ensure ID is string
            return { ...item, id: String(item.id) };
          });
        } else {
          sanitizedData[key] = [];
        }
      });

      // 2. Global Sync Timeout (Fail-safe)
      const syncPromise = migrateToFirestore(sanitizedData, (status) => {
        setMessage({ text: `⏳ ${status}`, type: 'info' });
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('La sincronización tardó demasiado (timeout 2 min). Revisa tu conexión.')), 120000)
      );

      await Promise.race([syncPromise, timeoutPromise]);
      
      // Calculate summary
      const summary = Object.entries(sanitizedData)
        .filter(([_, arr]) => Array.isArray(arr) && arr.length > 0)
        .map(([key, arr]) => `${arr.length} ${key}`)
        .join(', ');

      console.log('✅ Subida completada:', summary);
      showMessage(`✅ Subida Exitosa: ${summary || 'Sin datos nuevos'}`, 'success');
      
      // Actualizar timestamp
      localStorage.setItem('cueramaro_last_sync', new Date().toISOString());
      setLastSync(new Date());
    } catch (error) {
      console.error('❌ Error al subir:', error);
      showMessage(`❌ Error al subir: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      // Ensure message clears if it was stuck on progress
      setTimeout(() => {
        setMessage(prev => prev?.type === 'info' ? null : prev);
      }, 3000);
    }
  };

  const handleDescargarNube = async () => {
    if (!confirm('⚠️ ¿Estás seguro de DESCARGAR los datos? Esto REEMPLAZARÁ tus datos locales con los de la nube.')) return;

    setLoading(true);
    try {
      console.log('📥 Iniciando descarga manual...');
      const datos = await fullSyncFromFirestore();
      
      if (datos) {
        console.log('📥 Datos recibidos:', datos);
        
        // Count items
        const counts = [];
        
        // Guardar vía importación unificada
        await importarDatos(datos);
        
        Object.entries(datos).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            counts.push(`${value.length} ${key}`);
          }
        });
        
        await updateStats();
        
        showMessage(`✅ Descarga Exitosa: ${counts.join(', ') || 'Todo vacío'}`, 'success');
        setLastSync(new Date());
        
        // Recargar para aplicar cambios
        setTimeout(() => {
          if (confirm(`✅ Se descargaron: ${counts.join(', ') || '0 datos'}.\n\n¿Recargar página ahora?`)) {
            window.location.reload();
          }
        }, 500);
      } else {
        const errorMsg = '⚠️ Hubo un problema conectando con la nube. Intenta de nuevo.';
        console.warn(errorMsg);
        showMessage(errorMsg, 'warning');
      }
    } catch (error) {
      console.error('❌ Error al descargar:', error);
      showMessage('❌ Error al descargar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LIMPIEZA DE CACHÉ (Navegador)
  // ========================================
  const handleLimpiarCache = async () => {
    if (!confirm('¿Estás seguro de limpiar los archivos residuales? Esto refrescará la aplicación y liberará espacio en el navegador.')) return;
    
    setLoading(true);
    try {
      // 1. Limpiar Service Workers (PWA)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Limpiar Caches de red (Imágenes viejas, scripts cacheados)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let name of cacheNames) {
          await caches.delete(name);
        }
      }

      // 3. Limpiar SessionStorage
      sessionStorage.clear();

      showMessage('✅ Archivos residuales limpiados. Recargando...', 'success');
      setTimeout(() => {
        window.location.reload(true); // Hard reload
      }, 1500);
    } catch (error) {
      console.error('Error limpiando caché:', error);
      showMessage('❌ Hubo un error al limpiar la caché.', 'error');
      setLoading(false);
    }
  };

  // ========================================
  // RESET DATOS
  // ========================================
  // ========================================
  // RESET DATOS
  // ========================================
  const handleResetDatos = async () => {
    if (resetConfirmText !== 'BORRAR TODO') {
      showMessage('⚠️ Escribe "BORRAR TODO" para confirmar', 'warning');
      return;
    }

    if (!confirm('🛑 ÚLTIMA ADVERTENCIA: Se borrará TODO de tu dispositivo Y DE LA NUBE (Firebase). Esta acción es irreversible chaval. ¿Seguro?')) {
      return;
    }

    setLoading(true);
    try {
      // 1. Borrar de la Nube (Firestore)
      const { wipeCloudData } = await import('@/lib/sync');
      await wipeCloudData((status) => {
        setMessage({ text: `⏳ ${status}`, type: 'warning' });
      });

      // 2. Borrar Local
      await resetearDatos();
      await updateStats();
      
      setShowResetConfirm(false);
      setResetConfirmText('');
      showMessage('✅ SISTEMA LIMPIO: Se borró todo en Local y Nube.', 'success');
    } catch (error) {
      console.error('Error reset:', error);
      showMessage('❌ Error borrando nube: ' + error.message, 'error');
      // Aún así borramos local para que no se quede bloqueado
      await resetearDatos();
      await updateStats();
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <main className="main-content">
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.backButton}>
            ← Volver
          </Link>
          <h1>⚙️ Configuración</h1>
          <p>Gestiona respaldos, sincronización y datos del sistema</p>
        </div>
      </header>

      {/* Mensaje de feedback */}
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Banner de Estado de Sincronización */}
      {/* Banner de Estado de Sincronización */}
      <div className={`${styles.warningBanner}`} style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
        <span>📝</span>
        <div>
          <strong style={{ color: '#64748b' }}>Modo de Sincronización Manual</strong>
          <p>Los datos se guardan solo en tu dispositivo. Usa "Subir a la Nube" para respaldarlos.</p>
        </div>
      </div>

      {/* Estadísticas */}
      <section className={styles.section}>
        <h2>📊 Datos Almacenados</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>👥</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.clientes || 0}</div>
              <div className={styles.statLabel}>Clientes</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📦</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.productos || 0}</div>
              <div className={styles.statLabel}>Productos</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🛒</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.ventas || 0}</div>
              <div className={styles.statLabel}>Ventas</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📄</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.facturas || 0}</div>
              <div className={styles.statLabel}>Facturas</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>💸</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.gastos || 0}</div>
              <div className={styles.statLabel}>Gastos</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🚚</span>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{stats.proveedores || 0}</div>
              <div className={styles.statLabel}>Proveedores</div>
            </div>
          </div>
        </div>
      </section>

      {/* Respaldo Local */}
      <section className={styles.section}>
        <h2>💾 Respaldo Local</h2>
        <p className={styles.sectionDesc}>Guarda una copia de tus datos en tu dispositivo.</p>
        
        <div className={styles.actionGrid}>
          <button 
            className={`${styles.actionButton} ${styles.primary}`}
            onClick={handleDescargarRespaldo}
          >
            <span>📥</span>
            <div>
              <strong>Descargar Respaldo</strong>
              <small>Archivo JSON con todos tus datos</small>
            </div>
          </button>

          <button 
            className={`${styles.actionButton} ${styles.secondary}`}
            onClick={handleCrearBackupLocal}
          >
            <span>💾</span>
            <div>
              <strong>Backup en Navegador</strong>
              <small>{lastBackup ? `Último: ${lastBackup}` : 'Sin backup'}</small>
            </div>
          </button>

          <label className={`${styles.actionButton} ${styles.secondary}`}>
            <span>📤</span>
            <div>
              <strong>Restaurar Respaldo</strong>
              <small>Cargar archivo JSON</small>
            </div>
            <input 
              type="file" 
              accept=".json"
              onChange={handleRestaurarRespaldo}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </section>

      {/* Conexión de Dispositivos (Manual) - OCULTO POR ID GLOBAL */}
      {/* 
      <section className={styles.section}>
        <h2>🔗 Conexión de Dispositivos</h2>
        <p className={styles.sectionDesc}>
          Para compartir datos, ambos dispositivos deben tener el mismo <strong>ID de Negocio</strong>.
        </p>

        <div className={styles.idContainer}>
             ... (Código oculto) ...
        </div>
      </section>
      */}


      <section className={styles.section}>
        <h2>🕵️‍♂️ Diagnóstico de Nube</h2>
        <p className={styles.sectionDesc}>
          Usa esto si los datos no aparecen en otros dispositivos. Verifica qué hay realmente en la nube.
        </p>
        
        <button 
          className={styles.actionButton}
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}
          onClick={async () => {
            setLoading(true);
            try {
              const { checkCloudHealth } = await import('@/lib/sync');
              const report = await checkCloudHealth();
              
              let msg = `🆔 ID: ${report.negocioId}\n\n`;
              if (report.error) {
                msg += `❌ Error: ${report.error}`;
                showMessage(msg, 'error');
              } else {
                delete report.negocioId;
                const lines = Object.entries(report).map(([k, v]) => `${k}: ${v} docs`);
                msg += lines.join('\n');
                alert(msg); // Usamos alert para que pueda copiar/ver todo fácil
                showMessage('✅ Diagnóstico completado');
              }
            } catch (e) {
              alert('Error: ' + e.message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <span>🔍</span>
          <div>
            <strong>Inspeccionar Nube</strong>
            <small>Ver cuántos datos hay guardados en Firebase</small>
          </div>
        </button>

        <button 
          className={styles.actionButton}
          style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b' }}
          onClick={async () => {
             setLoading(true);
             try {
               const { testImageUpload } = await import('@/lib/imageHelper');
               const result = await testImageUpload();
               if (result.success) {
                 alert(`✅ PRUEBA EXITOSA\n\nLa imagen se subió correctamente.\nURL: ${result.url}`);
               } else {
                 alert(`❌ FALLÓ LA PRUEBA\n\nError: ${result.error}\nCódigo: ${result.code || 'N/A'}`);
               }
             } catch (e) {
               alert('Error ejecutando prueba: ' + e.message);
             } finally {
               setLoading(false);
             }
          }}
          disabled={loading}
        >
          <span>📸</span>
          <div>
            <strong>Probar Subida Imagen</strong>
            <small>Verificar conexión con Storage</small>
          </div>
        </button>
        <button 
          className={styles.actionButton}
          style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b' }}
          onClick={handleLimpiarCache}
          disabled={loading}
        >
          <span>🧹</span>
          <div>
            <strong>Limpiar Archivos Residuales</strong>
            <small>Libera caché del navegador si la app va lenta o no carga datos nuevos</small>
          </div>
        </button>
      </section>

      {/* Sincronización Nube */}
      <section className={styles.section}>
        <h2>☁️ Sincronización a la Nube</h2>
        <p className={styles.sectionDesc}>
          Sube tus datos a Firebase para tenerlos seguros. <strong>Recomendado: 1 vez al día.</strong>
        </p>
        
        <div className={styles.actionGrid}>
          <button 
            className={`${styles.actionButton} ${styles.cloud}`}
            onClick={handleSubirNube}
            disabled={loading}
          >
            <span>{loading ? '⏳' : '⬆️'}</span>
            <div>
              <strong>Subir a la Nube</strong>
              <small>Sincronizar datos con Firebase</small>
            </div>
          </button>

          <button 
            className={`${styles.actionButton} ${styles.cloudSecondary}`}
            onClick={handleDescargarNube}
            disabled={loading}
          >
            <span>{loading ? '⏳' : '⬇️'}</span>
            <div>
              <strong>Descargar de la Nube</strong>
              <small>Restaurar desde Firebase</small>
            </div>
          </button>
        </div>
      </section>

      {/* Herramientas de Reparación de Datos */}
      <section className={styles.section}>
        <h2>🛠️ Herramientas Avanzadas</h2>
        <p className={styles.sectionDesc}>
          Utiliza estas herramientas solo si tienes problemas graves de corrupción o lentitud.
        </p>
        <RescueDB />
      </section>

      {/* Reset de Datos */}
      <section className={`${styles.section} ${styles.dangerSection}`}>
        <h2>🗑️ Zona de Peligro</h2>
        <p className={styles.sectionDesc}>
          Estas acciones son irreversibles. Asegúrate de tener un respaldo antes de continuar.
        </p>
        
        {!showResetConfirm ? (
          <button 
            className={`${styles.actionButton} ${styles.danger}`}
            onClick={() => setShowResetConfirm(true)}
          >
            <span>⚠️</span>
            <div>
              <strong>Borrar Todos los Datos</strong>
              <small>Elimina toda la información local</small>
            </div>
          </button>
        ) : (
          <div className={styles.confirmBox}>
            <p>Para confirmar, escribe <strong>BORRAR TODO</strong>:</p>
            <input 
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="BORRAR TODO"
              className={styles.confirmInput}
            />
            <div className={styles.confirmActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmText('');
                }}
              >
                Cancelar
              </button>
              <button 
                className={styles.confirmButton}
                onClick={handleResetDatos}
              >
                Confirmar Borrado
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
