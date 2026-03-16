import { useState, useEffect } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { BillingService } from '@/lib/services/billingService';
import { InventoryService } from '@/lib/services/inventoryService';
import { parseDecimal } from '@/lib/numberToText';
import { addVenta, addFactura, generarNumeroFactura, deleteVenta } from '@/lib/storage';

/**
 * Controlador de la Vista de Ventas (Equivalente al ViewController/StateNotifier).
 * Aísla todos los `useState` y funciones de acción de la UI React (JSX).
 * 
 * @returns {Object} Estado unificado y funciones expuestas a la Vista.
 */
export function useVentasController() {
  // 1. Conexión con Estado Global (Zustand)
  const { productos, clientes, ventas, fetchInitialData, refreshProductos, refreshVentas, refreshClientes } = usePOSStore();

  // 2. Estado Local UI (Carrito, Buscadores y Filtros)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('contado');
  const [tipoFactura, setTipoFactura] = useState('debito'); 
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState(''); 
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas'); 
  
  // 3. Modales y Popups UI State
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [facturaGenerada, setFacturaGenerada] = useState(null);
  const [mostrarFacturaPreview, setMostrarFacturaPreview] = useState(false);
  
  // 4. Modal de Eliminación UI
  const [ventaAEliminar, setVentaAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  // === EFECTOS DE VIDA (Init) ===
  useEffect(() => {
    // 🔥 Ya NO usamos el hack del eventListener 'cueramaro_data_updated'
    // Delegamos la carga al Store Global que persiste durante toda la app.
    if (productos.length === 0 && ventas.length === 0) {
        fetchInitialData();
    }
  }, [fetchInitialData, productos.length, ventas.length]);


  // === FUNCIONES DE ASISTENCIA A LA VISTA ===

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente('');
    setMostrarClientes(false);
    setDireccionEntrega(cliente.direccionEntrega || '');

    if (cliente.tipoCliente === 'credito') {
      setMetodoPago('credito');
      setTipoFactura('credito');
      setFechaVencimiento('');
    } else {
      setMetodoPago('contado');
      setTipoFactura('debito');
      setFechaVencimiento('');
    }
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) {
      showToast('Este producto no tiene stock disponible', 'error');
      return;
    }

    const existente = carrito.find(item => item.id === producto.id);
    if (existente) {
      if (!InventoryService.validarDisponibilidad(existente.cantidad + 1, producto.stock)) {
        showToast(`Solo hay ${producto.stock} ${producto.unidad} disponibles`, 'warning');
        return;
      }
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    const producto = productos.find(p => p.id === productoId);

    if (nuevaCantidad === '') {
      setCarrito(carrito.map(item =>
        item.id === productoId ? { ...item, cantidad: '' } : item
      ));
      return;
    }

    const cantidadDecimal = parseDecimal(nuevaCantidad);

    if (!InventoryService.validarDisponibilidad(cantidadDecimal, producto.stock)) {
      showToast(`Solo hay ${producto.stock} ${producto.unidad} disponibles`, 'warning');
      return;
    }

    setCarrito(carrito.map(item =>
      item.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.id !== productoId));
  };

  const limpiarVenta = () => {
    setClienteSeleccionado(null);
    setCarrito([]);
    setMetodoPago('contado');
    setTipoFactura('debito');
    setFechaVencimiento('');
    setDireccionEntrega(''); 
    setBusquedaCliente('');
    setBusquedaProducto('');
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      showToast('Agrega productos al carrito', 'warning');
      return;
    }

    if (metodoPago === 'credito' && !clienteSeleccionado) {
      showToast('Selecciona un cliente para ventas a crédito', 'warning');
      return;
    }

    if (tipoFactura === 'credito' && !fechaVencimiento) {
      showToast('Selecciona la fecha de vencimiento para crédito', 'warning');
      return;
    }

    setProcesando(true);

    try {
      const hoy = new Date();
      const fechaEmision = hoy.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
      const fechaVencFormatted = tipoFactura === 'credito'
        ? BillingService.formatearFechaVencimiento(fechaVencimiento)
        : fechaEmision;

      const subtotal = BillingService.calcularSubtotal(carrito);
      const total = subtotal; // Aquí en el futuro se pueden agregar impuestos

      // 1. Construir e Insertar Venta
      const payloadVenta = BillingService.construirPayloadVenta({
        carrito,
        clienteSeleccionado,
        metodoPago,
        tipoFactura,
        fechaVencimiento,
        subtotal,
        total
      });
      const nuevaVenta = await addVenta(payloadVenta);

      // 2. Construir e Insertar Factura
      const tipoFolio = tipoFactura === 'credito' ? 'credito' : 'contado';
      const numFactura = await generarNumeroFactura(tipoFolio, clienteSeleccionado?.nombre || 'PUBLICO GENERAL');
      const plazoPago = tipoFactura === 'credito' 
        ? BillingService.calcularDiasPlazo(fechaVencimiento)
        : 'INMEDIATO';

      const datosFactura = BillingService.construirPayloadFactura({
        ventaId: nuevaVenta.id,
        numFactura,
        fechaEmision,
        fechaVencFormatted,
        plazoPago,
        carrito,
        clienteSeleccionado,
        direccionEntrega,
        metodoPago,
        tipoFactura,
        subtotal,
        total
      });
      const facturaCreada = await addFactura(datosFactura);

      setFacturaGenerada({
        ...datosFactura,
        id: facturaCreada.id,
        numeroFactura: facturaCreada.numeroFactura
      });

      // 3. Sincronizar Global Store (Refresca componentes en React Automáticamente)
      await Promise.all([
          refreshProductos(),
          refreshVentas(),
          ifCreditoRefreshClientes()
      ]);

      limpiarVenta();
      setMostrarFacturaPreview(true);
      showToast(`Venta #${nuevaVenta.id} - Factura ${facturaCreada.numeroFactura} generada`, 'success');

    } catch (error) {
      console.error('Error al procesar venta:', error);
      showToast('❌ Error al guardar la venta: ' + error.message, 'error');
    } finally {
      setProcesando(false);
    }
  };

  const ifCreditoRefreshClientes = async () => {
    if (metodoPago === 'credito' && clienteSeleccionado) {
      await refreshClientes();
    }
  };

  // Funciones de Eliminación
  const iniciarEliminacion = (venta) => {
    setVentaAEliminar(venta);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = async () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && ventaAEliminar) {
      await deleteVenta(ventaAEliminar.id);
      await refreshVentas(); // Refresca Global Store
      setMostrarModalEliminar(false);
      setVentaAEliminar(null);
      setConfirmarTexto('');
      showToast(`Venta #${ventaAEliminar.id} eliminada`, 'success');
    }
  };

  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setVentaAEliminar(null);
    setConfirmarTexto('');
  };

  return {
    state: {
      productos,
      clientes,
      ventas,
      clienteSeleccionado,
      carrito,
      metodoPago,
      tipoFactura,
      fechaVencimiento,
      direccionEntrega,
      busquedaCliente,
      busquedaProducto,
      filtroCategoria,
      mostrarClientes,
      mostrarHistorial,
      procesando,
      toast,
      facturaGenerada,
      mostrarFacturaPreview,
      ventaAEliminar,
      confirmarTexto,
      mostrarModalEliminar
    },
    actions: {
      setBusquedaCliente,
      setMostrarClientes,
      setBusquedaProducto,
      setFiltroCategoria,
      setMetodoPago,
      setTipoFactura,
      setFechaVencimiento,
      setMostrarHistorial,
      setMostrarFacturaPreview,
      setConfirmarTexto,
      seleccionarCliente,
      agregarAlCarrito,
      actualizarCantidad,
      eliminarDelCarrito,
      limpiarVenta,
      procesarVenta,
      iniciarEliminacion,
      confirmarEliminacion,
      cancelarEliminacion
    }
  };
}
