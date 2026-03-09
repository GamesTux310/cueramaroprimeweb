import { 
  getVentas, 
  getCompras, 
  getAbonos, 
  getGastos, 
  getNotas, 
  getMermas,
  getClientes,
  getProveedores
} from './storage';
import { syncToFirestore, softDeleteFromFirestore } from './sync';

import localforage from 'localforage';

const STORAGE_KEYS = {
  EVENTOS: 'cueramaro_eventos_calendario'
};

const isClient = typeof window !== 'undefined';

/**
 * Obtener eventos manuales (Recordatorios, Citas)
 */
export async function getCustomEvents() {
  if (!isClient) return [];
  try {
    const data = await localforage.getItem(STORAGE_KEYS.EVENTOS);
    return data || [];
  } catch (error) {
    console.error('Error getCustomEvents', error);
    return [];
  }
}

/**
 * Guardar eventos manuales
 */
async function saveCustomEvents(eventos) {
  if (!isClient) return;
  try {
    await localforage.setItem(STORAGE_KEYS.EVENTOS, eventos);
  } catch(error) {
    console.error('Error saveCustomEvents', error);
  }
}

/**
 * Agregar un nuevo evento manual (Recordatorio/Cita)
 * @param {object} evento - { titulo, fecha, hora, descripcion, tipo: 'recordatorio'|'cita' }
 */
export async function addCustomEvent(evento) {
  const eventos = await getCustomEvents();
  const nuevoId = Date.now().toString(); // ID único basado en tiempo
  
  const nuevoEvento = {
    ...evento,
    id: nuevoId,
    origen: 'manual', // Diferenciador de eventos del sistema
    completado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  eventos.push(nuevoEvento);
  await saveCustomEvents(eventos);
  
  // Sincronizar con Firebase
  syncToFirestore('eventos_calendario', nuevoEvento).catch(console.error);
  
  return nuevoEvento;
}

/**
 * Actualizar un evento manual
 */
export async function updateCustomEvent(id, cambios) {
  const eventos = await getCustomEvents();
  const index = eventos.findIndex(e => e.id === id);
  
  if (index !== -1) {
    eventos[index] = {
      ...eventos[index],
      ...cambios,
      updatedAt: new Date().toISOString()
    };
    await saveCustomEvents(eventos);
    
    // Sincronizar
    syncToFirestore('eventos_calendario', eventos[index]).catch(console.error);
    return eventos[index];
  }
  return null;
}

/**
 * Eliminar un evento manual
 */
export async function deleteCustomEvent(id) {
  const eventos = await getCustomEvents();
  const filtrados = eventos.filter(e => e.id !== id);
  await saveCustomEvents(filtrados);
  
  // Soft delete en Firebase
  softDeleteFromFirestore('eventos_calendario', id).catch(console.error);
}

// Helper para formato de moneda
function formatMoney(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(amount || 0);
}

/**
 * Normalizar un objeto de venta/gasto/etc a formato EventoGlobal
 */
const normalizeEvento = (item, tipo, clientes, proveedores) => {
  let titulo = '';
  let icono = '';
  let color = '';
  let detalles = {};
  
  // Si ya viene normalizado (ej: recordatorio manual o vencimiento)
  if (tipo === 'recordatorio' && item.titulo) {
      return {
        id: item.id || Math.random().toString(),
        originalId: item.id,
        tipo,
        titulo: item.titulo,
        descripcion: item.descripcion,
        fecha: item.fecha,
        hora: item.hora || '09:00',
        monto: item.monto || 0,
        icono: '🔔',
        color: 'yellow',
        origen: item.origen || 'sistema',
        raw: item
      };
  }
  
  switch (tipo) {
    case 'venta':
      // Buscar cliente de forma laxa (string o number)
      const cliente = clientes.find(c => String(c.id) === String(item.clienteId));
      const nombreCliente = cliente ? cliente.nombre.split(' ')[0] : 'Cliente';
      
      // Construir título descriptivo
      titulo = `Venta ${nombreCliente} - ${formatMoney(item.total)}`;
      icono = '🛒';
      color = 'blue';
      
      // Mapear todas las propiedades clave para que estén disponibles en el detalle
      detalles = { 
        clienteId: item.clienteId, 
        clienteNombre: cliente ? cliente.nombre : 'Cliente Desconocido',
        productos: item.productos || [],
        metodoPago: item.metodoPago || item.tipoPago || 'Desconocido', // Asegurar lectura correcta
        tipoFactura: item.tipoFactura || item.tipoVenta, // Asegurar lectura de tipo (credito/debito)
        fechaVencimiento: item.fechaVencimiento,
        historialVencimientos: item.historialVencimientos || [], // 🆕 Pasar el historial
        estado: item.estado || (item.tipoFactura === 'credito' ? 'pendiente' : 'pagado'),
        utilidadReal: item.utilidadReal,
        total: item.total
      };
      break;
    case 'compra':
      const proveedor = proveedores.find(p => p.id === item.proveedorId);
      titulo = `Compra ${proveedor ? proveedor.nombre : ''} - ${formatMoney(item.total)}`;
      icono = '📦';
      color = 'purple';
      detalles = { proveedorId: item.proveedorId };
      break;
    case 'abono':
      const clienteAbono = clientes.find(c => c.id === item.clienteId);
      titulo = `Abono ${clienteAbono ? clienteAbono.nombre.split(' ')[0] : ''} - ${formatMoney(item.monto)}`;
      icono = '💰';
      color = 'green';
      break;
    case 'gasto':
      titulo = `${item.descripcion || 'Gasto'} - ${formatMoney(item.monto)}`;
      icono = '💸';
      color = 'red';
      break;
    case 'nota':
      titulo = `Nota: ${item.titulo}`;
      icono = '📝';
      color = 'yellow';
      break;
    case 'merma':
      titulo = `Merma: ${item.productoNombre || 'Prod'} (${item.cantidad})`;
      icono = '📉';
      color = 'orange';
      break;
    default:
      titulo = 'Evento';
      icono = '📅';
      color = 'gray';
  }

  return {
    id: item.id || Math.random().toString(),
    originalId: item.id,
    tipo,
    titulo,
    fecha: item.fecha, 
    hora: item.hora || (item.fecha ? new Date(item.fecha).getHours().toString().padStart(2, '0') + ':' + new Date(item.fecha).getMinutes().toString().padStart(2, '0') : '12:00'),
    monto: item.total || item.monto || item.costoTotal || 0,
    icono,
    color,
    // Fusionar detalles específicos con propiedades raíz para acceso directo
    ...detalles,
    detalles, // Mantener objeto detalles por compatibilidad si es necesario
    origen: item.origen || 'sistema',
    raw: item 
  };
};

/**
 * Obtener TODOS los eventos unificados para el calendario
 * @param {object} filters - Filtros opcionales { fechaInicio, fechaFin, tipos }
 */
export async function getUnifiedEvents(filters = {}) {
  // 1. Obtener datos crudos
  const ventas = await getVentas();
  const compras = await getCompras();
  const abonos = await getAbonos();
  const gastos = await getGastos();
  const notas = await getNotas();
  const mermas = await getMermas();
  const eventosManuales = await getCustomEvents();
  
  // 2. Cargar catálogos para enriquecer títulos (lookup optimization)
  const clientes = await getClientes();
  const proveedores = await getProveedores();
  
  // 3. Normalizar todo a una sola lista
  const todos = [
    ...ventas.map(i => normalizeEvento(i, 'venta', clientes, proveedores)),
    ...compras.map(i => normalizeEvento(i, 'compra', clientes, proveedores)),
    ...abonos.map(i => normalizeEvento(i, 'abono', clientes, proveedores)),
    ...gastos.map(i => normalizeEvento(i, 'gasto', clientes, proveedores)),
    ...notas.map(i => normalizeEvento(i, 'nota', clientes, proveedores)),
    ...mermas.map(i => normalizeEvento(i, 'merma', clientes, proveedores)),
    ...eventosManuales.map(i => normalizeEvento(i, 'recordatorio', clientes, proveedores))
  ];
  
  // 4. Filtrar y Ordenar
  return todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
