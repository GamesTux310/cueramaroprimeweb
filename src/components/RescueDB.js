'use client';

import { useState } from 'react';
import localforage from 'localforage';

export default function RescueDB() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const cleanNaN = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number') {
      return isNaN(obj) ? 0 : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(cleanNaN);
    }
    if (typeof obj === 'object') {
      const newObj = {};
      
      const numericKeys = [
          'monto', 'saldo', 'saldoPendiente', 'total', 
          'precioCompra', 'precioVenta', 'subtotal', 'stock', 
          'stockMinimo', 'cantidad', 'precioUnitario', 'costoTotal', 'iva'
      ];
        
      for (const key in obj) {
        const val = obj[key];
        
        // Structured clone o fallbacks que serialicen explícitamente a NaN
        if (Number.isNaN(val) || val === 'NaN') {
          newObj[key] = 0;
          continue;
        }

        // Si se serializó como null mágicamente y es campo numérico clave
        if (val === null && numericKeys.includes(key)) {
          newObj[key] = 0;
          continue;
        }

        newObj[key] = cleanNaN(val);
      }
      return newObj;
    }
    return obj;
  };

  const handleRescue = async () => {
    const confirmation = window.confirm('¿Estás seguro de limpiar la base de datos?\nEsto reemplazará TODOS los valores tipo NaN o corruptos por numéricos (0) para estabilizar el sistema.');
    if (!confirmation) return;
    
    setIsLoading(true);
    const newLogs = [];
    const addLog = (msg) => {
        newLogs.push(msg);
        setLogs([...newLogs]);
    };

    try {
      const collections = [
        'proveedores', 
        'ventas', 
        'productos', 
        'compras', 
        'gastos', 
        'facturas',
        'clientes',
        'creditos',
        'lotes',
        'mermas'
      ];

      for (const col of collections) {
        addLog(`Revisando colección: ${col}...`);
        const data = await localforage.getItem(col);
        
        if (data && Array.isArray(data)) {
          let fixedCount = 0;
          
          const cleanedData = data.map(item => {
            const originalJson = JSON.stringify(item);
            const cleanedItem = cleanNaN(item);
            if (JSON.stringify(cleanedItem) !== originalJson) {
              fixedCount++;
            }
            return cleanedItem;
          });

          if (fixedCount > 0) {
            await localforage.setItem(col, cleanedData);
            addLog(`✅ Corregidos ${fixedCount} registros en la colección ${col}.`);
          } else {
            addLog(`✓ Colección ${col} está sana y limpia.`);
          }
        } else {
            addLog(`⚠️ Colección ${col} no existe o está vacía, saltando...`);
        }
      }

      addLog('Limpieza completada exitosamente.');
      setTimeout(() => {
          alert('¡Limpieza exitosa! Se corrigieron los registros con NaN o null en campos numéricos vitales.\nRecarga la página para verificar la estabilidad de tu app.');
      }, 300);
    } catch (error) {
      console.error(error);
      addLog(`❌ Error crítico: ${error.message}`);
      setTimeout(() => {
          alert('Ocurrió un error al limpiar la base de datos. Pide al equipo de desarrollo que revise los logs.');
      }, 300);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', margin: '20px 0', border: '2px solid #ef4444', borderRadius: '8px', backgroundColor: '#fef2f2' }}>
      <h3 style={{ color: '#b91c1c', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>⚠️</span> Panel de Rescate (Emergencia)
      </h3>
      <p style={{ fontSize: '14px', color: '#7f1d1d', marginBottom: '15px' }}>
        Utiliza esta herramienta UNICAMENTE si la aplicación presenta "Client-Side Exceptions", pantallas en blanco o errores por datos corruptos ("NaN") en montos, precios o saldos. Ejecutar este botón saneará todas las colecciones principales de IndexedDB / LocalForage de manera profunda.
      </p>
      <button 
        onClick={handleRescue}
        disabled={isLoading}
        style={{
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 20px',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          width: '100%',
          fontSize: '16px'
        }}
      >
        {isLoading ? 'Limpiando Base de Datos...' : '🩺 Ejecutar Limpiador de NaN'}
      </button>

      {logs.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#111827', color: '#10b981', fontFamily: 'monospace', fontSize: '13px', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto', border: '1px solid #374151' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
