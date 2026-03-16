import { create } from 'zustand';
import { getClientes, getProductos, getVentas } from '@/lib/storage';

/**
 * Hook Global de Estado (Equivalente a Riverpod/Provider en Flutter).
 * Permite a cualquier pantalla o componente acceder a los datos sin  
 * tener que recargar desde la Base de Datos continuamente ni usar window.events.
 */
export const usePOSStore = create((set, get) => ({
  // 1. Estado (Variables)
  productos: [],
  clientes: [],
  ventas: [],
  
  // 2. Estado de Carga UI
  isLoading: false,
  error: null,

  // 3. Acciones (Funciones Mutadoras)
  
  /**
   * Carga inicial y refresco de los datos principales desde la capa de persistencia (storage.js).
   * Sustituye al antiguo "cueramaro_data_updated" window event.
   */
  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [clientesData, productosData, ventasData] = await Promise.all([
        getClientes(),
        getProductos(),
        getVentas()
      ]);
      set({ 
        clientes: clientesData, 
        productos: productosData, 
        ventas: ventasData,
        isLoading: false 
      });
    } catch (err) {
      console.error("Error cargando store POS:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * Actualiza únicamente la lista de productos (Ej: Después de una venta que afecta el stock)
   */
  refreshProductos: async () => {
    const productosData = await getProductos();
    set({ productos: productosData });
  },

  /**
   * Actualiza únicamente la lista de clientes (Ej: Después de una venta a crédito)
   */
  refreshClientes: async () => {
    const clientesData = await getClientes();
    set({ clientes: clientesData });
  },

  /**
   * Actualiza únicamente la lista de ventas (Ej: Después de facturar o eliminar una venta)
   */
  refreshVentas: async () => {
    const ventasData = await getVentas();
    set({ ventas: ventasData });
  }
}));
