// ========================================
// Configuración de Dexie.js (Base de Datos Relacional Offline)
// ========================================
import Dexie from 'dexie';

// 1. Instanciamos la base de datos
export const db = new Dexie('CueramaroAppDB');

// 2. Definimos las tablas y sus índices clave (NO es necesario definir todas las columnas, solo las indexadas)
// El "++" significa que el campo 'id' será Auto-Incrementable por defecto si no se provee.
db.version(2).stores({
  clientes: '++id, nombre, estado',
  productos: '++id, nombre, categoria, codigoBarras',
  
  // Índices para búsquedas rápidas (ej. todas las ventas de un cliente o proveedor)
  ventas: '++id, fecha, clienteId, estado', 
  
  proveedores: '++id, nombre, estado',
  facturas: '++id, proveedorId, fechaEmision, estado',
  
  gastos: '++id, fecha, categoria',
  abonos: '++id, proveedorId, facturaId, fecha', // Also stores comprobanteBase64

  
  compras: '++id, proveedorId, fecha',
  
  // Novedad: Lotes PEPS
  lotes: '++id, productoId, fechaCaducidad',
  
  notas: '++id, titulo, fecha',
  
  // Novedad: Mermas
  mermas: '++id, productoId, fecha'
});

// Verificación de cliente (evita que Dexie intente correr en SSR/Node.js)
export const isClient = typeof window !== 'undefined';
