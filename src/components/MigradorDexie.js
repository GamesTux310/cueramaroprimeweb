'use client';

import { useState } from 'react';
import localforage from 'localforage';
import { db } from '@/lib/db'; // Importamos la nueva base de datos Dexie

export default function MigradorDexie() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (message) => {
    setLog(prev => [...prev, message]);
    console.log(message);
  };

  const handleMigrar = async () => {
    if (!confirm('⚠️ ¿Estás seguro de migrar los datos locales a Dexie? Esta operación no borrará tus datos antiguos pero poblará el nuevo motor relacional.')) {
      return;
    }

    setIsMigrating(true);
    setLog(['🚀 Iniciando el Migrador Maestro de LocalForage -> Dexie.js...']);

    // Claves exactas que usaba el sistema antiguo en localForage
    const legacyKeys = {
      clientes: 'cueramaro_clientes',
      productos: 'cueramaro_productos',
      proveedores: 'cueramaro_proveedores',
      ventas: 'cueramaro_ventas',
      gastos: 'cueramaro_gastos',
      abonos: 'cueramaro_abonos',
      facturas: 'cueramaro_facturas',
      notas: 'cueramaro_notas',
      compras: 'cueramaro_compras',
      lotes: 'cueramaro_lotes'
    };

    try {
      // Configuramos explicitamente la instancia original por si acaso
      localforage.config({
        name: 'CueramaroApp',
        storeName: 'cueramaro_data',
      });

      // Recorremos cada clave antigua, extraemos el array, y usamos bulkPut en dexie
      for (const [tabla, keyLocalForage] of Object.entries(legacyKeys)) {
        addLog(`📂 Leyendo datos de: ${keyLocalForage}...`);
        
        const dataRaw = await localforage.getItem(keyLocalForage);
        let arrayDatos = [];

        if (dataRaw) {
          // A veces guardaban JSON string, a veces el array directo
          arrayDatos = typeof dataRaw === 'string' ? JSON.parse(dataRaw) : dataRaw;
        }

        if (arrayDatos && arrayDatos.length > 0) {
          // Limpiamos la tabla en Dexie para asegurar que no duplicamos datos en reintentos
          await db[tabla].clear();
          
          // bulkPut inserta todo el arreglo rapidísimo respetando los IDs originales (esencial para foráneas juntas)
          await db[tabla].bulkPut(arrayDatos);
          addLog(`✅ Migrados ${arrayDatos.length} registros a la tabla Dexie: [${tabla}]`);
        } else {
          addLog(`⏭️ Cero registros encontrados en ${keyLocalForage}. Saltando tabla [${tabla}].`);
        }
      }

      // Tabla especial: mermas no estaba en la constante pero se guardaba en localforage
      addLog(`📂 Leyendo datos de: cueramaro_mermas (Local Storage/LocalForage legacy)...`);
      const rawMermas = localStorage.getItem('cueramaro_mermas') || await localforage.getItem('cueramaro_mermas');
      
      // Dexie no tiene tabla de mermas (usamos proxy a localStorage en config previa), pero por si a futuro la agregamos, lo advertimos.
      addLog(`ℹ️ Mermas se conservan en su mecanismo actual temporalmente.`);

      addLog('🎉 ¡Migración Total a Dexie completada con éxito!');
      alert('¡Migración completada con éxito! Ya puedes recargar la página para ver tus datos volando en el nuevo motor relacional.');
      
    } catch (error) {
      console.error('❌ Error catastrófico en la migración:', error);
      addLog(`❌ ERROR: ${error.message}`);
      alert('Hubo un error al intentar migrar. Revisa la consola para más detalles.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div style={{
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#eff6ff',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ color: '#1e3a8a', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.5rem' }}>🔄</span> Asistente de Evolución a Dexie.js
      </h3>
      <p style={{ color: '#1e40af', fontSize: '0.9rem', lineHeight: '1.5' }}>
        El motor de la base de datos se ha actualizado. Para recuperar tu información en pantalla, 
        necesitamos transferir los registros antiguos del caché a las nuevas tablas relacionales. 
        Este proceso tarda menos de 1 segundo.
      </p>

      <button
        onClick={handleMigrar}
        disabled={isMigrating}
        style={{
          backgroundColor: isMigrating ? '#93c5fd' : '#2563eb',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '1ren',
          fontWeight: 'bold',
          cursor: isMigrating ? 'wait' : 'pointer',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '15px'
        }}
      >
        {isMigrating ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
            Migrando...
          </>
        ) : (
          <>
            <span>⚡</span>
            Migrar Datos Históricos a Dexie
          </>
        )}
      </button>

      {log.length > 0 && (
        <div style={{
          marginTop: '20px',
          backgroundColor: '#1e293b',
          color: '#38bdf8',
          padding: '15px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {log.map((line, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
