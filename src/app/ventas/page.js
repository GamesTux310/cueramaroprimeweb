'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './ventas.module.css';
import { 
  getClientes, 
  getProductos, 
  getVentas, 
  addVenta, 
  deleteVenta,
  actualizarStock,
  updateCliente,
  getClientes as reloadClientes,
  addFactura,
  generarNumeroFactura
} from '@/lib/storage';
import { FacturaPreview } from '@/components/factura';
import { formatearMoneda, formatearNumero, parseDecimal } from '@/lib/numberToText';

export default function VentasPage() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  
  // Estado del punto de venta
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('contado');
  const [tipoFactura, setTipoFactura] = useState('debito'); // debito = hoy, credito = fecha seleccionable
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState(''); // 🆕 Dirección de entrega
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Estado para factura generada y preview
  const [facturaGenerada, setFacturaGenerada] = useState(null);
  const [mostrarFacturaPreview, setMostrarFacturaPreview] = useState(false);
  
  // Estado para eliminación con confirmación
  const [ventaAEliminar, setVentaAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

  // Función para mostrar toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Función para iniciar proceso de eliminación
  const iniciarEliminacion = (venta) => {
    setVentaAEliminar(venta);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  // Función para confirmar eliminación
  const confirmarEliminacion = async () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && ventaAEliminar) {
      await deleteVenta(ventaAEliminar.id);
      setVentas(await getVentas());
      setMostrarModalEliminar(false);
      setVentaAEliminar(null);
      setConfirmarTexto('');
      showToast(`Venta #${ventaAEliminar.id} eliminada`, 'success');
    }
  };

  // Cancelar eliminación
  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setVentaAEliminar(null);
    setConfirmarTexto('');
  };
  
  // Cargar datos y escuchar cambios en tiempo real
  useEffect(() => {
    const cargarDatos = async () => {
      setClientes(await getClientes());
      setProductos(await getProductos());
      setVentas(await getVentas());
    };

    cargarDatos();

    window.addEventListener('cueramaro_data_updated', cargarDatos);
    return () => window.removeEventListener('cueramaro_data_updated', cargarDatos);
  }, []);

  // Filtrar clientes por búsqueda (mostrar todos si no hay búsqueda)
  const clientesFiltrados = busquedaCliente.length > 0 
    ? clientes.filter(c => 
        (c.nombre || '').toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        (c.telefono || '').includes(busquedaCliente)
      ).slice(0, 8)
    : clientes.slice(0, 8);

  // Filtrar productos por búsqueda
  const productosFiltrados = productos.filter(p => 
    (p.nombre || '').toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  // Calcular totales
  const subtotal = carrito.reduce((sum, item) => sum + (item.precioVenta * parseDecimal(item.cantidad)), 0);
  const total = subtotal;

  // Estadísticas del día - mitigando problemas de timezone (UTC a Local)
  const hoy = new Date();
  
  const ventasHoy = ventas.filter(v => {
    if (!v.fecha) return false;
    // v.fecha puede venir como '2026-03-04T00:24...Z'
    const fechaVenta = new Date(v.fecha);
    return fechaVenta.getFullYear() === hoy.getFullYear() &&
           fechaVenta.getMonth() === hoy.getMonth() &&
           fechaVenta.getDate() === hoy.getDate();
  });
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  const ventasContadoHoy = ventasHoy.filter(v => v.metodoPago === 'contado').reduce((sum, v) => sum + v.total, 0);
  const ventasCreditoHoy = ventasHoy.filter(v => v.metodoPago === 'credito').reduce((sum, v) => sum + v.total, 0);

  const getCategoriaIcon = (categoria) => {
    const iconos = {
      'Res': '🥩',
      'Cerdo': '🐷',
      'Pollo': '🍗',
      'Embutidos': '🌭',
    };
    return iconos[categoria] || '📦';
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente('');
    setMostrarClientes(false);
    // 🆕 Inicializar dirección de entrega con la dirección de entrega del cliente (sin fallback a dirección fiscal)
    setDireccionEntrega(cliente.direccionEntrega || '');
    
    // Si el cliente es de crédito, configurar automáticamente el tipo, PERO NO LOS DÍAS
    if (cliente.tipoCliente === 'credito') {
      setMetodoPago('credito');
      setTipoFactura('credito');
      
      // Ya NO calculamos fecha automática basada en cliente.diasCredito
      // Se deja vacío o con fecha de hoy para que el usuario elija manualmente
      setFechaVencimiento(''); 
    } else {
      // Si no es crédito, volver a contado por defecto
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
      if (existente.cantidad >= producto.stock) {
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
    
    // Permitir string vacío para edición
    if (nuevaCantidad === '') {
      setCarrito(carrito.map(item => 
        item.id === productoId 
          ? { ...item, cantidad: '' }
          : item
      ));
      return;
    }

    const cantidadDecimal = parseDecimal(nuevaCantidad);
    
    // Validación de stock solo si es un número válido
    if (cantidadDecimal > producto.stock) {
      showToast(`Solo hay ${producto.stock} ${producto.unidad} disponibles`, 'warning');
      return;
    }
    
    // Si es 0 o menor (y no es vacío), preguntamos o eliminamos
    // Pero para UX de escritura (ej: escribiendo 0.5), permitimos el 0 inicial
    // La limpieza real se hace en onBlur o botón eliminar
    
    setCarrito(carrito.map(item => 
      item.id === productoId 
        ? { ...item, cantidad: nuevaCantidad } // Guardamos lo que viene (puede ser número o string '0.')
        : item
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
    setDireccionEntrega(''); // 🆕 Limpiar dirección de entrega
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

    // Validar fecha vencimiento para crédito
    if (tipoFactura === 'credito' && !fechaVencimiento) {
      showToast('Selecciona la fecha de vencimiento para crédito', 'warning');
      return;
    }

    setProcesando(true);

    try {
      // Fechas
      const hoy = new Date();
      const fechaEmision = hoy.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
      const fechaVenc = tipoFactura === 'credito' 
        ? (() => {
            const [anio, mes, dia] = fechaVencimiento.split('-');
            return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
          })()
        : fechaEmision;

      // Crear la venta
      const nuevaVenta = await addVenta({
        clienteId: clienteSeleccionado?.id || null,
        clienteNombre: clienteSeleccionado?.nombre || 'Público General',
        productos: carrito.map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidad: parseDecimal(item.cantidad),
          unidad: item.unidad || 'KG',
          codigo: `PROD-${String(item.id).padStart(3, '0')}`,
          precioUnitario: item.precioVenta,
          subtotal: item.precioVenta * parseDecimal(item.cantidad)
        })),
        subtotal: subtotal,
        descuento: 0,
        total: total,
        metodoPago: metodoPago,
        tipoFactura: tipoFactura,
        // 🔥 FIX CRÍTICO: Guardar la fecha de vencimiento seleccionada
        fechaVencimiento: tipoFactura === 'credito' ? fechaVencimiento : null,
        historialVencimientos: [], // Inicializar historial vacío
        estado: metodoPago === 'credito' ? 'pendiente' : 'pagado',
      });

      // Actualizar stock de productos. En la lib/storage addVenta ya hace esto para compatibilidad, pero lo dejaremos así por seguridad visual o lo limpiaremos pronto si hay colisión.
      // ⚠️ UPDATE: `addVenta` internamente ya descuenta stock al usar await actualizarStock(). Solo refrescamos los productos.
      setProductos(await getProductos());

      // Si es a crédito, actualizar saldo del cliente. La lib/storage ya lo hace, solo refrescamos.
      if (metodoPago === 'credito' && clienteSeleccionado) {
        setClientes(await getClientes());
      }

      // 🆕 Generar factura automáticamente
      const numFactura = await generarNumeroFactura();
      const datosFactura = {
        ventaId: nuevaVenta.id,
        numeroFactura: numFactura,
      fechaEmision: fechaEmision,
      fechaVencimiento: fechaVenc,
      expedidaEn: 'CUERÁMARO, GUANAJUATO',
      metodoPago: metodoPago === 'credito' ? 'CRÉDITO' : metodoPago === 'transferencia' ? 'TRANSFERENCIA' : 'CONTADO/EFECTIVO',
      plazoPago: tipoFactura === 'credito'
        ? (() => {
            // Fix: Normalizar ambas fechas a medianoche local para cálculo exacto de días
            const hoy = new Date();
            const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

            const [anio, mes, dia] = fechaVencimiento.split('-'); // fechaVencimiento viene como YYYY-MM-DD
            const vencMidnight = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));

            const diffTime = vencMidnight - hoyMidnight;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `${diffDays} DÍAS`;
          })()
        : 'INMEDIATO',
      tipoFactura: tipoFactura, // debito o credito
      vendedor: 'OSCAR PANTOJA',
      cliente: {
        codigo: clienteSeleccionado ? `CLI-${String(clienteSeleccionado.id).padStart(3, '0')}` : 'CLI-000',
        nombre: clienteSeleccionado?.nombre || 'PÚBLICO GENERAL',
        direccion: clienteSeleccionado?.direccion || '',
        cp: clienteSeleccionado?.cp || '',
        rfc: clienteSeleccionado?.rfc || '',
        telefono: clienteSeleccionado?.telefono || '',
        ciudad: clienteSeleccionado?.ciudad || '', // 🆕 Ciudad explícita añadida
        direccionEntrega: direccionEntrega || '' // 🆕 Dirección de entrega (solo lo que se escribe)
      },
      productos: carrito.map(item => ({
        cantidad: parseDecimal(item.cantidad),
        codigo: `PROD-${String(item.id).padStart(3, '0')}`,
        unidad: item.unidad || 'KG',
        descripcion: item.nombre.toUpperCase(),
        precioUnitario: item.precioVenta,
        importe: item.precioVenta * parseDecimal(item.cantidad)
      })),
      subtotal: subtotal,
      total: total,
      estado: metodoPago === 'credito' ? 'pendiente' : 'pagado'
    };

    const facturaCreada = addFactura(datosFactura);

    // Guardar para mostrar preview
    setFacturaGenerada({
      ...datosFactura,
      id: facturaCreada.id,
      numeroFactura: facturaCreada.numeroFactura
    });

    // Refrescar datos
    setProductos(await getProductos());
    setVentas(await getVentas());
    setClientes(await reloadClientes());

    // Limpiar venta
    limpiarVenta();

    // Mostrar preview de factura
      setMostrarFacturaPreview(true);
      showToast(`Venta #${nuevaVenta.id} - Factura ${facturaCreada.numeroFactura} generada`, 'success');
    } catch (error) {
      console.error('Error al procesar venta:', error);
      showToast('❌ Error al guardar la venta: ' + error.message, 'error');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          <span className={styles.toastIcon}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
          </span>
          <span className={styles.toastMessage}>{toast.message}</span>
        </div>
      )}
      
    <main className="main-content">
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backButton}>
              ← Regresar
            </Link>
            <div className={styles.headerTitle}>
              <span className={styles.headerIcon}>🛒</span>
              <div>
                <h1>Punto de Venta</h1>
                <p>Registrar ventas</p>
              </div>
            </div>
          </div>
          <button
            className={styles.historialButton}
            onClick={() => setMostrarHistorial(true)}
          >
            <span>📋</span> Historial
          </button>
        </div>
      </header>

      {/* Estadísticas del día */}
      <section className={styles.statsSection}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>📊</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{ventasHoy.length}</span>
            <span className={styles.statLabel}>Ventas Hoy</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>💵</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{formatearMoneda(totalVentasHoy)}</span>
            <span className={styles.statLabel}>Total del Día</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>💳</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{formatearMoneda(ventasCreditoHoy)}</span>
            <span className={styles.statLabel}>A Crédito</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e0e7ff', color: '#6366f1' }}>💰</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{formatearMoneda(ventasContadoHoy)}</span>
            <span className={styles.statLabel}>Contado</span>
          </div>
        </div>
      </section>

      {/* Área principal */}
      <div className={styles.ventaContainer}>
        {/* Panel de productos */}
        <div className={styles.productosPanel}>
          <div className={styles.panelHeader}>
            <h2>📦 Productos</h2>
            <div className={styles.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
              />
            </div>
          </div>
          
          <div className={styles.productosGrid}>
            {productosFiltrados.map((producto) => (
              <div 
                key={producto.id} 
                className={`${styles.productoCard} ${producto.stock <= 0 ? styles.sinStock : ''}`}
                onClick={() => agregarAlCarrito(producto)}
              >
                {producto.imagenURL ? (
                  <img 
                    src={producto.imagenURL} 
                    alt={producto.nombre}
                    className={styles.productoImg}
                  />
                ) : (
                  <span className={styles.productoEmoji}>{getCategoriaIcon(producto.categoria)}</span>
                )}
                <div className={styles.productoInfo}>
                  <span className={styles.productoNombre}>{producto.nombre}</span>
                  <span className={styles.productoPrecio}>{formatearMoneda(producto.precioVenta)}</span>
                </div>
                <span className={`${styles.stockBadge} ${producto.stock <= producto.stockMinimo ? styles.bajo : ''}`}>
                  {formatearNumero(producto.stock)} {producto.unidad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel del carrito */}
        <div className={styles.carritoPanel}>
          {/* Selector de cliente */}
          <div className={styles.clienteSection}>
            <label>👤 Cliente</label>
            {clienteSeleccionado ? (
              <div className={styles.clienteSeleccionado}>
                <div className={styles.clienteInfo}>
                  {clienteSeleccionado.avatarURL ? (
                    <img 
                      src={clienteSeleccionado.avatarURL} 
                      alt="Avatar"
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }}
                    />
                  ) : null}
                  <div>
                    <span className={styles.clienteNombre}>{clienteSeleccionado.nombre}</span>
                    <span className={styles.clienteTipo}>
                      {clienteSeleccionado.tipoCliente === 'credito' ? '💳 Crédito' : '💵 Contado'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setClienteSeleccionado(null)}>✕</button>
              </div>
            ) : (
              <div className={styles.clienteSearch}>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarClientes(e.target.value.length > 0);
                  }}
                  onFocus={() => setMostrarClientes(true)}
                  onBlur={() => setTimeout(() => setMostrarClientes(false), 200)}
                />
                {mostrarClientes && clientesFiltrados.length > 0 && (
                  <div className={styles.clienteDropdown}>
                    {clientesFiltrados.map((cliente) => (
                      <div 
                        key={cliente.id} 
                        className={styles.clienteOption}
                        onClick={() => seleccionarCliente(cliente)}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                         {cliente.avatarURL ? (
                            <img 
                              src={cliente.avatarURL} 
                              alt="Avatar"
                              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }}
                            />
                          ) : (
                            <div style={{ 
                              width: '30px', 
                              height: '30px', 
                              borderRadius: '50%', 
                              background: '#e5e7eb', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              marginRight: '10px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: '#6b7280'
                            }}>
                              {cliente.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                        <span style={{ flex: 1 }}>{cliente.nombre}</span>
                        <span className={styles.clienteTipoBadge}>
                          {cliente.tipoCliente === 'credito' ? '💳' : '💵'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Carrito */}
          <div className={styles.carritoItems}>
            <h3>🛒 Carrito ({carrito.length})</h3>
            {carrito.length === 0 ? (
              <div className={styles.carritoVacio}>
                <span>🛒</span>
                <p>Agrega productos al carrito</p>
              </div>
            ) : (
              <div className={styles.itemsList}>
                {carrito.map((item) => (
                  <div key={item.id} className={styles.carritoItem}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemNombre}>{item.nombre}</span>
                      <span className={styles.itemPrecio}>{formatearMoneda(item.precioVenta)} / {item.unidad}</span>
                    </div>
                    <div className={styles.itemCantidad}>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>−</button>
                        <input
                          type="number"
                          value={item.cantidad}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            actualizarCantidad(item.id, e.target.value);
                          }}
                          onBlur={(e) => {
                            // Si al salir está vacío o 0, resetear a 1 o eliminar (según preferencia)
                            // Aquí reseteamos a 1 si quedó inválido para evitar errores
                            if (!item.cantidad || item.cantidad === 0) actualizarCantidad(item.id, 1);
                          }}
                          step="0.001"
                          min="0"
                          style={{
                          width: '80px',
                          textAlign: 'center',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          padding: '4px',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}
                      />
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>+</button>
                    </div>
                    <div className={styles.itemSubtotal}>
                      {formatearMoneda(item.precioVenta * parseDecimal(item.cantidad))}
                    </div>
                    <button 
                      className={styles.eliminarBtn}
                      onClick={() => eliminarDelCarrito(item.id)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className={styles.metodoPagoSection}>
            <label>💳 Método de Pago</label>
            <div className={styles.metodoPagoOptions}>
              <button
                className={`${styles.metodoPagoBtn} ${metodoPago === 'contado' ? styles.active : ''}`}
                onClick={() => { setMetodoPago('contado'); setTipoFactura('debito'); }}
              >
                💵 Contado
              </button>
              <button
                className={`${styles.metodoPagoBtn} ${metodoPago === 'credito' ? styles.active : ''}`}
                onClick={() => { setMetodoPago('credito'); setTipoFactura('credito'); }}
              >
                💳 Crédito
              </button>
              <button
                className={`${styles.metodoPagoBtn} ${metodoPago === 'transferencia' ? styles.active : ''}`}
                onClick={() => { setMetodoPago('transferencia'); setTipoFactura('debito'); }}
              >
                🏦 Transferencia
              </button>
            </div>
          </div>

          {/* 🆕 Tipo de Factura */}
          <div className={styles.metodoPagoSection}>
            <label>📄 Tipo de Factura</label>
            <div className={styles.metodoPagoOptions}>
              <button
                className={`${styles.metodoPagoBtn} ${tipoFactura === 'debito' ? styles.active : ''}`}
                onClick={() => setTipoFactura('debito')}
              >
                ⚡ Débito (Hoy)
              </button>
              <button
                className={`${styles.metodoPagoBtn} ${tipoFactura === 'credito' ? styles.active : ''}`}
                onClick={() => setTipoFactura('credito')}
              >
                📅 Crédito (Plazo)
              </button>
            </div>
          </div>

          {/* Fecha de Vencimiento (solo para crédito) */}
          {tipoFactura === 'credito' && (
            <div className={styles.metodoPagoSection}>
              <label>📅 Fecha de Vencimiento</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                min={new Date().toLocaleDateString('en-CA')} // Formato YYYY-MM-DD local
                className={styles.dateInput}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
            </div>
          )}

          {/* 🆕 Dirección de Entrega */}
          <div className={styles.metodoPagoSection}>
            <label>📍 Dirección de Entrega</label>
            <input
              type="text"
              value={direccionEntrega}
              readOnly
              placeholder={clienteSeleccionado ? (clienteSeleccionado.direccionEntrega || "Sin dirección de entrega registrada") : "Selecciona un cliente"}
              className={styles.dateInput}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#666' }}
            />
            {clienteSeleccionado && (
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Por defecto: {clienteSeleccionado.direccion || 'Sin dirección'}
              </small>
            )}
          </div>

          {/* Totales */}
          <div className={styles.totalesSection}>
            <div className={styles.totalRow}>
              <span>Subtotal:</span>
              <span>{formatearMoneda(subtotal)}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.totalFinal}`}>
              <span>Total:</span>
              <span>{formatearMoneda(total)}</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className={styles.accionesSection}>
            <button 
              className={styles.btnLimpiar}
              onClick={limpiarVenta}
            >
              🗑️ Limpiar
            </button>
            <button 
              className={styles.btnProcesar}
              onClick={procesarVenta}
              disabled={procesando || carrito.length === 0}
            >
              {procesando ? '⏳ Procesando...' : '✅ Cobrar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Historial */}
      {mostrarHistorial && (
        <div className={styles.modalOverlay} onClick={() => setMostrarHistorial(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>📋 Historial de Ventas</h2>
              <button className={styles.closeButton} onClick={() => setMostrarHistorial(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {ventas.length === 0 ? (
                <div className={styles.emptyState}>
                  <span>📭</span>
                  <p>No hay ventas registradas</p>
                </div>
              ) : (
                <div className={styles.historialList}>
                  {ventas.slice().reverse().map((venta) => (
                    <div key={venta.id} className={styles.historialItem}>
                      <div className={styles.historialHeader}>
                        <span className={styles.ventaId}>#{venta.id}</span>
                        <span className={styles.ventaFecha}>{venta.fecha}</span>
                        <span className={`${styles.ventaEstado} ${styles[venta.estado]}`}>
                          {venta.estado === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                        </span>
                      </div>
                      <div className={styles.historialBody}>
                        <span className={styles.ventaCliente}>👤 {venta.clienteNombre}</span>
                        <span className={styles.ventaProductos}>
                          {venta.productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}
                        </span>
                      </div>
                      <div className={styles.historialFooter}>
                        <span className={`${styles.metodoBadge} ${styles[venta.metodoPago]}`}>
                          {venta.metodoPago === 'contado' ? '💵 Contado' : 
                           venta.metodoPago === 'transferencia' ? '🏦 Transferencia' : '💳 Crédito'}
                        </span>
                        <div className={styles.historialActions}>
                          <span className={styles.ventaTotal}>{formatearMoneda(venta.total)}</span>
                          <button 
                            className={styles.btnEliminarVenta}
                            style={{ 
                              padding: '6px 12px', borderRadius: '6px', border: '1px solid #fca5a5', 
                              background: '#fef2f2', color: '#dc2626', fontWeight: '600', 
                              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                            onClick={() => iniciarEliminacion(venta)}
                            title="Eliminar venta"
                          >
                            <span>🗑️</span> Eliminar Venta
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {mostrarModalEliminar && (
        <div className={styles.modalOverlay} onClick={cancelarEliminacion}>
          <div className={`${styles.modal} ${styles.modalEliminar}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>⚠️ Confirmar Eliminación</h2>
              <button className={styles.closeButton} onClick={cancelarEliminacion}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.eliminarWarning}>
                <span className={styles.warningIcon}>🚨</span>
                <div className={styles.warningText}>
                  <h3>¿Estás seguro de eliminar esta venta?</h3>
                  <p>Esta acción no se puede deshacer. Se eliminará permanentemente:</p>
                  {ventaAEliminar && (
                    <div className={styles.ventaResumen}>
                      <span><strong>Venta #{ventaAEliminar.id}</strong></span>
                      <span>Cliente: {ventaAEliminar.clienteNombre}</span>
                      <span>Total: {formatearMoneda(ventaAEliminar.total)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.confirmarInput}>
                <label>Escribe <strong>"eliminar"</strong> para confirmar:</label>
                <input 
                  type="text"
                  value={confirmarTexto}
                  onChange={(e) => setConfirmarTexto(e.target.value)}
                  placeholder="Escribe eliminar"
                  autoFocus
                />
              </div>
              <div className={styles.eliminarActions}>
                <button 
                  className={styles.btnCancelar}
                  onClick={cancelarEliminacion}
                >
                  Cancelar
                </button>
                <button 
                  className={styles.btnConfirmarEliminar}
                  onClick={confirmarEliminacion}
                  disabled={confirmarTexto.toLowerCase() !== 'eliminar'}
                >
                  🗑️ Eliminar Definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal de Vista Previa de Factura */}
      {mostrarFacturaPreview && facturaGenerada && (
        <FacturaPreview
          factura={facturaGenerada}
          onClose={() => {
            setMostrarFacturaPreview(false);
            setFacturaGenerada(null);
          }}
          onFacturaGuardada={() => {
            // La factura ya se guardó en localStorage
          }}
        />
      )}
    </main>
    </>
  );
}
