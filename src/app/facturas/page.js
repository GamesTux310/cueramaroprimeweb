'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './facturas.module.css';
import { FacturaPreview } from '@/components/factura'; 
import FormularioFacturaCompleto from '@/components/FormularioFacturaCompleto'; // 🆕 Importado explícitamente
import { 
  getFacturas, 
  addFactura, 
  updateFactura, 
  deleteFactura, 
  getVentas, 
  getClientes,
  getCompras, 
  getProveedores
} from '@/lib/storage';

// Componente simple para el formulario (ya que no lo tengo a mano, asumo que estaba importado o definido externamente, pero para evitar errores lo defino aquí si no existe, aunque el código original lo usaba como <FormularioFacturaCompleto /> sin importarlo explícitamente en el snippet visible. Asumiré que existe o que debo mantenerlo. En el código original aparecía usado en el JSX.
// Viendo el código original, parece que FormularioFacturaCompleto no estaba importado en las líneas que leí, lo cual es extraño. Ah, no, estaba en el JSX.
// Asumiré que está definido en otro archivo o que debo importarlo si lo borré.
// Revisando el Read anterior... no veo import de FormularioFacturaCompleto.
// Espera, el Read anterior muestra el uso en la línea 658, pero no la importación.
// Es posible que esté definido en el mismo archivo pero más abajo y el Read no lo mostró?
// El Read mostró hasta la línea 669 y el archivo terminaba ahí.
// Entonces FormularioFacturaCompleto NO está definido. El código original probablemente fallaba o yo no vi la importación.
// Ah, espera, quizás estaba importado y no lo vi.
// Revisaré los imports de nuevo.
// Líneas 1-15: imports. No está.
// Esto es raro. Quizás el usuario tiene un componente que no he visto.
// Bueno, mantendré el código tal cual y solo agregaré lo mío.

// Para no romper nada, voy a usar SearchReplace para inyectar los cambios en lugar de reescribir todo el archivo.

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]); 
  const [compras, setCompras] = useState([]); // 🆕
  const [proveedores, setProveedores] = useState([]); // 🆕
  const [tabActiva, setTabActiva] = useState('ventas'); // 🆕
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarModalGenerar, setMostrarModalGenerar] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarFormularioCompleto, setMostrarFormularioCompleto] = useState(false); 
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaPreview, setFacturaPreview] = useState(null);
  
  // Estados para eliminación segura
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    estado: 'pagada',
    notas: ''
  });

  useEffect(() => {
    const cargarDatos = async () => {
      setFacturas(await getFacturas());
      setVentas(await getVentas());
      setClientes(await getClientes());
      setCompras(await getCompras()); // 🆕
      setProveedores(await getProveedores()); // 🆕
    };
    cargarDatos();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cantidad);
  };

  // Helper para fechas
  const parsearFecha = (fechaInput) => {
    if (!fechaInput) return new Date();
    if (fechaInput instanceof Date) return fechaInput;
    if (fechaInput.indexOf('T') > -1) return new Date(fechaInput);
    if (typeof fechaInput === 'string' && fechaInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fechaInput.split('-');
      return new Date(anio, mes - 1, dia);
    }
    return new Date(fechaInput);
  };

  const formatearFecha = (fecha) => {
    return parsearFecha(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrar facturas (Ventas)
  const facturasFiltradas = facturas.filter(factura => {
    const coincideBusqueda = 
      (factura.numeroFactura || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (factura.cliente?.nombre || factura.clienteNombre || '').toLowerCase().includes(busqueda.toLowerCase());

    const hoy = new Date();
    const fechaFactura = parsearFecha(factura.fecha);
    let coincidePeriodo = true;

    if (filtroPeriodo === 'hoy') {
      coincidePeriodo = fechaFactura.toDateString() === hoy.toDateString();
    } else if (filtroPeriodo === 'semana') {
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hoy.getDate() - 7);
      coincidePeriodo = fechaFactura >= hace7Dias;
    } else if (filtroPeriodo === 'mes') {
      coincidePeriodo = fechaFactura.getMonth() === hoy.getMonth() && 
                       fechaFactura.getFullYear() === hoy.getFullYear();
    }

    const coincideEstado = filtroEstado === 'todos' || factura.estado === filtroEstado;

    return coincideBusqueda && coincidePeriodo && coincideEstado;
  });

  // Filtrar compras (Proveedores)
  const comprasFiltradas = compras.filter(compra => {
    const coincideBusqueda = 
      (compra.proveedorNombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (compra.productoNombre || '').toLowerCase().includes(busqueda.toLowerCase());

    const hoy = new Date();
    const fechaCompra = parsearFecha(compra.fecha);
    let coincidePeriodo = true;

    if (filtroPeriodo === 'hoy') {
      coincidePeriodo = fechaCompra.toDateString() === hoy.toDateString();
    } else if (filtroPeriodo === 'semana') {
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hoy.getDate() - 7);
      coincidePeriodo = fechaCompra >= hace7Dias;
    } else if (filtroPeriodo === 'mes') {
      coincidePeriodo = fechaCompra.getMonth() === hoy.getMonth() && 
                       fechaCompra.getFullYear() === hoy.getFullYear();
    }

    // Filtro estado para compras (aproximado)
    let coincideEstado = true;
    if (filtroEstado !== 'todos') {
        const esCredito = compra.tipoCompra === 'credito';
        if (filtroEstado === 'pagada') {
            coincideEstado = !esCredito; // Asumimos contado = pagada
        } else if (filtroEstado === 'pendiente') {
            coincideEstado = esCredito;
        }
    }

    return coincideBusqueda && coincidePeriodo && coincideEstado;
  });


  // Estadísticas
  const totalFacturado = facturas.reduce((sum, f) => sum + f.total, 0);
  const facturasMes = facturas.filter(f => {
    const fecha = parsearFecha(f.fecha);
    const hoy = new Date();
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  }).length;
  const facturasPendientes = facturas.filter(f => f.estado === 'pendiente').length;

  // Estadísticas Compras
  const totalComprado = compras.reduce((sum, c) => sum + (c.total || (c.cantidad * c.precioCompra)), 0);
  const comprasMes = compras.filter(c => {
    const fecha = parsearFecha(c.fecha);
    const hoy = new Date();
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  }).length;


  const seleccionarVenta = (venta) => {
    setVentaSeleccionada(venta);
    
    // Obtener cliente
    // Usar el estado "clientes" ya cargado asíncronamente
    const cliente = clientes.find(c => c.id == venta.clienteId);

    // Preparar preview de factura
    const subtotal = venta.total;
    // IVA eliminado por requerimiento
    const total = subtotal;

    const preview = {
      ventaId: venta.id,
      cliente: {
        nombre: cliente?.nombre || 'Cliente no encontrado',
        telefono: cliente?.telefono || '',
        direccion: cliente?.direccion || '',
        direccionEntrega: cliente?.direccionEntrega || '', 
        ciudad: cliente?.ciudad || '', 
        cp: cliente?.cp || '',
        rfc: cliente?.rfc || ''
      },
      productos: venta.productos,
      subtotal: subtotal,
      iva: 0,
      total: subtotal,
      metodoPago: venta.metodoPago,
      estado: formData.estado,
      notas: formData.notas
    };

    setFacturaPreview(preview);
    setMostrarVistaPrevia(true);
  };

  const generarFactura = async () => {
    if (!facturaPreview) return;

    const nuevaFactura = await addFactura(facturaPreview);
    setFacturas(await getFacturas());
    
    showToast(`Factura ${nuevaFactura.numeroFactura} generada exitosamente ✅`, 'success');
    
    setMostrarVistaPrevia(false);
    setMostrarModalGenerar(false);
    setVentaSeleccionada(null);
    setFacturaPreview(null);
    setFormData({ estado: 'pagada', notas: '' });
  };

  const cambiarEstado = async (factura) => {
    const nuevoEstado = factura.estado === 'pagada' ? 'pendiente' : 'pagada';
    await updateFactura(factura.id, { estado: nuevoEstado });
    setFacturas(await getFacturas());
    if (facturaSeleccionada?.id === factura.id) {
      setFacturaSeleccionada({ ...factura, estado: nuevoEstado });
    }
    showToast(`Estado actualizado a ${nuevoEstado}`, 'success');
  };

  // 🆕 Generar factura personalizada
  const generarFacturaPersonalizada = async (datosFormulario) => {
    try {
      // Generar número de factura
      const facturasData = await getFacturas();
      const año = new Date().getFullYear();
      const numeroSecuencial = String(facturasData.length + 1).padStart(3, '0');
      const numeroFactura = `F-${año}-${numeroSecuencial}`;
      
      // Preparar datos completos
      const facturaCompleta = {
        ...datosFormulario,
        numeroFactura,
        fecha: datosFormulario.fechaEmision
      };
      
      // Guardar en localforage
      await addFactura({
        ...facturaCompleta,
        ventaId: null,
        estado: 'pagada'
      });
      
      setFacturas(await getFacturas());
      setMostrarFormularioCompleto(false);
      showToast(`✅ Factura ${numeroFactura} generada exitosamente`, 'success');
    } catch (error) {
      console.error('Error al generar factura personalizada:', error);
      showToast('❌ Error al generar la factura', 'error');
    }
  };

  const iniciarEliminacion = (factura) => {
    setFacturaAEliminar(factura);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = async () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && facturaAEliminar) {
      await deleteFactura(facturaAEliminar.id);
      setFacturas(await getFacturas());
      setMostrarModalEliminar(false);
      setMostrarDetalle(false);
      setFacturaAEliminar(null);
      setConfirmarTexto('');
      showToast(`Factura ${facturaAEliminar.numeroFactura} eliminada`, 'success');
    }
  };

  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setFacturaAEliminar(null);
    setConfirmarTexto('');
  };

  const imprimirFactura = () => {
    window.print();
  };

  return (
    <>
      {/* Toast */}
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
              <span className={styles.headerIcon}>📄</span>
              <div>
                <h1>Facturas</h1>
                <p>Gestión de facturas y compras</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={styles.addButton}
              onClick={() => setMostrarModalGenerar(true)}
              title="Factura simple desde ventas"
            >
              <span>📝</span> Desde Venta
            </button>
            <button
              className={styles.addButton}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              onClick={() => setMostrarFormularioCompleto(true)}
              title="Factura personalizada completa"
            >
              <span>✨</span> Factura Personalizada
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
        <button 
            onClick={() => setTabActiva('ventas')}
            style={{ 
                padding: '10px 20px', 
                border: 'none', 
                background: 'transparent', 
                borderBottom: tabActiva === 'ventas' ? '3px solid #3b82f6' : '3px solid transparent',
                color: tabActiva === 'ventas' ? '#3b82f6' : '#6b7280',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '1rem'
            }}
        >
            📤 Ventas (Clientes)
        </button>
        <button 
            onClick={() => setTabActiva('compras')}
            style={{ 
                padding: '10px 20px', 
                border: 'none', 
                background: 'transparent', 
                borderBottom: tabActiva === 'compras' ? '3px solid #10b981' : '3px solid transparent',
                color: tabActiva === 'compras' ? '#10b981' : '#6b7280',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '1rem'
            }}
        >
            📥 Compras (Proveedores)
        </button>
      </div>

      {/* Estadísticas Dinámicas */}
      <section className={styles.statsSection}>
        {tabActiva === 'ventas' ? (
            <>
                <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>💰</div>
                <div className={styles.statInfo}>
                    <span className={styles.statValue}>{formatearMoneda(totalFacturado)}</span>
                    <span className={styles.statLabel}>Total Facturado</span>
                </div>
                </div>
                <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>📄</div>
                <div className={styles.statInfo}>
                    <span className={styles.statValue}>{facturasMes}</span>
                    <span className={styles.statLabel}>Facturas del Mes</span>
                </div>
                </div>
                <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>⏳</div>
                <div className={styles.statInfo}>
                    <span className={styles.statValue}>{facturasPendientes}</span>
                    <span className={styles.statLabel}>Pendientes de Cobro</span>
                </div>
                </div>
            </>
        ) : (
            <>
                <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>🛒</div>
                <div className={styles.statInfo}>
                    <span className={styles.statValue}>{formatearMoneda(totalComprado)}</span>
                    <span className={styles.statLabel}>Total Comprado</span>
                </div>
                </div>
                <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>📦</div>
                <div className={styles.statInfo}>
                    <span className={styles.statValue}>{comprasMes}</span>
                    <span className={styles.statLabel}>Compras del Mes</span>
                </div>
                </div>
                <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>💳</div>
                <div className={styles.statInfo}>
                    <span className={styles.statValue}>{compras.filter(c => c.tipoCompra === 'credito').length}</span>
                    <span className={styles.statLabel}>Compras a Crédito</span>
                </div>
                </div>
            </>
        )}
      </section>

      {/* Filtros */}
      <section className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder={tabActiva === 'ventas' ? "Buscar factura o cliente..." : "Buscar proveedor o producto..."}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <select
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="todos">Todos los periodos</option>
          <option value="hoy">Hoy</option>
          <option value="semana">Última semana</option>
          <option value="mes">Este mes</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="todos">Todos los estados</option>
          <option value="pagada">{tabActiva === 'ventas' ? '✅ Pagadas' : '💵 Contado'}</option>
          <option value="pendiente">{tabActiva === 'ventas' ? '⏳ Pendientes' : '💳 Crédito'}</option>
        </select>
      </section>

      {/* Grid de Contenido */}
      <section className={styles.facturasGrid}>
        {tabActiva === 'ventas' ? (
            // Renderizado de Facturas de Venta (Existente)
            facturasFiltradas.length === 0 ? (
            <div className={styles.emptyState}>
                {facturas.length === 0 
                ? '📭 No hay facturas generadas. ¡Crea la primera!' 
                : '🔍 No se encontraron facturas con esos filtros'}
            </div>
            ) : (
            facturasFiltradas.map((factura) => (
                <div key={factura.id} className={`${styles.facturaCard} ${styles[factura.estado]}`}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                    <span className={styles.numeroFactura}>{factura.numeroFactura}</span>
                    <span className={styles.fechaFactura}>{formatearFecha(factura.fecha)}</span>
                    </div>
                    <span className={`${styles.estadoBadge} ${styles[factura.estado]}`}>
                    {factura.estado === 'pagada' ? '✅ Pagada' : '⏳ Pendiente'}
                    </span>
                </div>
                
                <div className={styles.cardBody}>
                    <div className={styles.clienteInfo}>
                    <div className={styles.clienteAvatar}>
                        {(() => {
                        const nombreClient = factura.cliente?.nombre || factura.clienteNombre || '?';
                        const clienteActual = clientes.find(c => c.id === factura.clienteId || c.nombre === nombreClient) || factura.cliente || {};
                        return clienteActual.avatarURL ? (
                            <img 
                            src={clienteActual.avatarURL} 
                            alt={nombreClient} 
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            nombreClient ? nombreClient.charAt(0).toUpperCase() : '?'
                        );
                        })()}
                    </div>
                    <div className={styles.clienteDetalles}>
                        <span className={styles.clienteNombre}>{factura.cliente?.nombre || factura.clienteNombre || 'Desconocido'}</span>
                        <span className={styles.clienteTelefono}>📞 {factura.cliente?.telefono || 'N/A'}</span>
                    </div>
                    </div>

                    <div className={styles.productosResumen}>
                    <span>{(factura.productos || []).length} producto(s)</span>
                    </div>

                    <div className={styles.totalFactura}>
                    <span>Total:</span>
                    <span className={styles.totalMonto}>{formatearMoneda(factura.total)}</span>
                    </div>
                </div>

                <div className={styles.cardActionsColumn}>
                    <button 
                    className={styles.btnActionFull}
                    onClick={() => {
                        const nombreClient = factura.cliente?.nombre || factura.clienteNombre || '?';
                        const clienteActual = clientes.find(c => c.id === factura.clienteId || c.nombre === nombreClient) || factura.cliente || {};
                        const facturaParaImprimir = {
                        ...factura,
                        cliente: {
                            ...(factura.cliente || {}),
                            nombre: nombreClient,
                            ciudad: factura.cliente?.ciudad || clienteActual.ciudad || '',
                            direccion: factura.cliente?.direccion || clienteActual.direccion || '',
                            direccionEntrega: factura.cliente?.direccionEntrega || clienteActual.direccionEntrega || '',
                            cp: factura.cliente?.cp || clienteActual.cp || '',
                            rfc: factura.cliente?.rfc || clienteActual.rfc || ''
                        }
                        };
                        setFacturaPreview(facturaParaImprimir);
                        setMostrarVistaPrevia(true);
                    }}
                    title="Imprimir Factura"
                    style={{ backgroundColor: '#6366f1', color: 'white', borderColor: '#4f46e5' }}
                    >
                    🖨️ Imprimir Factura
                    </button>
                    <button 
                    className={styles.btnActionFull}
                    onClick={() => {
                        setFacturaSeleccionada(factura);
                        setMostrarDetalle(true);
                    }}
                    title="Ver Detalle"
                    >
                    📋 Ver Detalle
                    </button>
                    <button 
                    className={styles.btnActionFull}
                    onClick={() => cambiarEstado(factura)}
                    title={factura.estado === 'pagada' ? 'Marcar como pendiente' : 'Marcar como pagada'}
                    >
                    {factura.estado === 'pagada' ? '⏳ Marcar Pendiente' : '✅ Marcar Pagada'}
                    </button>
                    <button 
                    className={`${styles.btnActionFull} ${styles.btnDeleteFull}`}
                    onClick={() => iniciarEliminacion(factura)}
                    title="Eliminar"
                    >
                    🗑️ Eliminar
                    </button>
                </div>
                </div>
            ))
            )
        ) : (
            // Renderizado de Compras (Proveedores)
            comprasFiltradas.length === 0 ? (
                <div className={styles.emptyState}>
                    {compras.length === 0 
                    ? '📭 No hay compras registradas.' 
                    : '🔍 No se encontraron compras con esos filtros'}
                </div>
            ) : (
                comprasFiltradas.map((compra) => {
                    const esCredito = compra.tipoCompra === 'credito';
                    // Intentar obtener el saldo actual del proveedor
                    const proveedor = proveedores.find(p => p.id === compra.proveedorId);
                    const tieneDeuda = proveedor ? proveedor.saldoPendiente > 0 : false;
                    
                    return (
                    <div key={compra.id} className={`${styles.facturaCard} ${esCredito ? styles.pendiente : styles.pagada}`}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <span className={styles.numeroFactura}>COMPRA #{compra.id}</span>
                                <span className={styles.fechaFactura}>{formatearFecha(compra.fecha)}</span>
                            </div>
                            <span className={`${styles.estadoBadge} ${esCredito ? styles.pendiente : styles.pagada}`}>
                                {esCredito ? '💳 Crédito' : '💵 Contado'}
                            </span>
                        </div>
                        
                        <div className={styles.cardBody}>
                            <div className={styles.clienteInfo}>
                                <div className={styles.clienteAvatar} style={{ background: '#dbeafe', color: '#1e40af' }}>
                                    {compra.proveedorNombre ? compra.proveedorNombre.charAt(0).toUpperCase() : 'P'}
                                </div>
                                <div className={styles.clienteDetalles}>
                                    <span className={styles.clienteNombre}>{compra.proveedorNombre}</span>
                                    <span className={styles.clienteTelefono}>{compra.productoNombre}</span>
                                </div>
                            </div>

                            <div className={styles.productosResumen}>
                                <span>{compra.cantidad} {compra.unidad} @ {formatearMoneda(compra.precioCompra)}</span>
                            </div>

                            <div className={styles.totalFactura}>
                                <span>Total:</span>
                                <span className={styles.totalMonto}>{formatearMoneda(compra.total || (compra.cantidad * compra.precioCompra))}</span>
                            </div>
                            
                            {esCredito && compra.fechaVencimiento && (
                                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '5px' }}>
                                    Vence: {formatearFecha(compra.fechaVencimiento)}
                                </div>
                            )}
                        </div>

                        <div className={styles.cardActionsColumn}>
                             {compra.adjuntoURL && (
                                <a 
                                    href={compra.adjuntoURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.btnActionFull}
                                    style={{ backgroundColor: '#3b82f6', color: 'white', borderColor: '#2563eb', textDecoration: 'none' }}
                                    title="Ver Comprobante"
                                >
                                    📄 Ver Comprobante
                                </a>
                            )}
                            {esCredito && tieneDeuda && (
                                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666', marginTop: '4px' }}>
                                    Deuda Prov: {formatearMoneda(proveedor.saldoPendiente)}
                                </div>
                            )}
                        </div>
                    </div>
                )})
            )
        )}
      </section>

      {/* Modales (se mantienen igual) */}
      {mostrarModalGenerar && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalGenerar(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>➕ Generar Factura</h2>
              <button className={styles.closeButton} onClick={() => setMostrarModalGenerar(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <h4>Selecciona una venta:</h4>
              <div className={styles.ventasList}>
                {ventas.length === 0 ? (
                  <p className={styles.noVentas}>No hay ventas registradas</p>
                ) : (
                  ventas.slice(-10).reverse().map((venta) => {
                    const cliente = clientes.find(c => c.id === venta.clienteId);
                    return (
                      <div 
                        key={venta.id} 
                        className={styles.ventaItem}
                        onClick={() => seleccionarVenta(venta)}
                      >
                        <div className={styles.ventaInfo}>
                          <span className={styles.ventaCliente}>{cliente?.nombre || 'Cliente no encontrado'}</span>
                          <span className={styles.ventaFecha}>{formatearFecha(venta.fecha)}</span>
                        </div>
                        <span className={styles.ventaTotal}>{formatearMoneda(venta.total)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa Reutilizable */}
      {mostrarVistaPrevia && facturaPreview && (
        <FacturaPreview 
          factura={facturaPreview} 
          onClose={() => setMostrarVistaPrevia(false)}
          onFacturaGuardada={async () => {
            // Opcional: Recargar facturas si se guardó algo nuevo
            setFacturas(await getFacturas());
          }}
        />
      )}

      {/* Modal Detalle */}
      {mostrarDetalle && facturaSeleccionada && (
        <div className={styles.modalOverlay} onClick={() => setMostrarDetalle(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>📄 {facturaSeleccionada.numeroFactura}</h2>
              <button className={styles.closeButton} onClick={() => setMostrarDetalle(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleFactura}>
                <div className={styles.detalleSection}>
                  <h4>Cliente</h4>
                  <p><strong>{facturaSeleccionada.cliente?.nombre || facturaSeleccionada.clienteNombre || 'Desconocido'}</strong></p>
                  <p>📞 {facturaSeleccionada.cliente?.telefono || 'N/A'}</p>
                  <p>📍 {facturaSeleccionada.cliente?.direccion || 'N/A'}</p>
                </div>

                <div className={styles.detalleSection}>
                  <h4>Información de Factura</h4>
                  <p>Fecha: {formatearFecha(facturaSeleccionada.fecha)}</p>
                  <p>Método de pago: {facturaSeleccionada.metodoPago}</p>
                  <p>Estado: <span className={`${styles.estadoBadge} ${styles[facturaSeleccionada.estado]}`}>
                    {facturaSeleccionada.estado === 'pagada' ? '✅ Pagada' : '⏳ Pendiente'}
                  </span></p>
                </div>

                <div className={styles.detalleSection}>
                  <h4>Productos</h4>
                  {(facturaSeleccionada.productos || []).map((item, idx) => {
                    const precio = Number(item.precioUnitario || item.precio || 0);
                    const total = Number(item.subtotal || item.importe || (item.cantidad * precio) || 0);
                    return (
                      <div key={idx} className={styles.productoDetalle}>
                        <span>{item.nombre || item.descripcion} - {item.cantidad} {item.unidad}</span>
                        <span>{formatearMoneda(total)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.detalleTotales}>
                  <div><span>Subtotal:</span> <span>{formatearMoneda(facturaSeleccionada.subtotal)}</span></div>
                  <div className={styles.detalleTotal}><span>Total:</span> <span>{formatearMoneda(facturaSeleccionada.total)}</span></div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnDanger}
                onClick={() => iniciarEliminacion(facturaSeleccionada)}
              >
                🗑️ Eliminar
              </button>
              <button 
                className={styles.btnSecondary}
                onClick={() => cambiarEstado(facturaSeleccionada)}
              >
                {facturaSeleccionada.estado === 'pagada' ? '⏳ Marcar Pendiente' : '✅ Marcar Pagada'}
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={() => {
                  const nombreClient = facturaSeleccionada.cliente?.nombre || facturaSeleccionada.clienteNombre || '?';
                  const clienteActual = clientes.find(c => c.id === facturaSeleccionada.clienteId || c.nombre === nombreClient) || facturaSeleccionada.cliente || {};
                  const facturaParaImprimir = {
                    ...facturaSeleccionada,
                    cliente: {
                      ...(facturaSeleccionada.cliente || {}),
                      nombre: nombreClient,
                      ciudad: facturaSeleccionada.cliente?.ciudad || clienteActual.ciudad || '',
                      direccion: facturaSeleccionada.cliente?.direccion || clienteActual.direccion || '',
                      direccionEntrega: facturaSeleccionada.cliente?.direccionEntrega || clienteActual.direccionEntrega || '',
                      cp: facturaSeleccionada.cliente?.cp || clienteActual.cp || '',
                      rfc: facturaSeleccionada.cliente?.rfc || clienteActual.rfc || ''
                    }
                  };
                  setFacturaPreview(facturaParaImprimir);
                  setMostrarVistaPrevia(true);
                }}
                style={{ background: '#6366f1' }}
              >
                🖨️ Imprimir PDF
              </button>
              <button className={styles.btnPrimary} onClick={() => setMostrarDetalle(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {mostrarModalEliminar && facturaAEliminar && (
        <div className={styles.modalOverlay} onClick={cancelarEliminacion}>
          <div className={`${styles.modal} ${styles.modalEliminar}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>⚠️ Confirmar Eliminación</h2>
              <button className={styles.closeButton} onClick={cancelarEliminacion}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.advertenciaEliminar}>
                <span className={styles.advertenciaIcono}>🗑️</span>
                <p><strong>¿Estás seguro de eliminar esta factura?</strong></p>
                <p className={styles.advertenciaTexto}>
                  Esta acción eliminará permanentemente:<br/>
                  • Factura: <strong>{facturaAEliminar.numeroFactura}</strong><br/>
                  • Cliente: {facturaAEliminar.cliente?.nombre || facturaAEliminar.clienteNombre || 'Desconocido'}<br/>
                  • Total: {formatearMoneda(facturaAEliminar.total)}
                </p>
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
                <button className={styles.btnCancelar} onClick={cancelarEliminacion}>
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

      {/* Modal Formulario Factura Personalizada */}
      {mostrarFormularioCompleto && (
        <div className={styles.modalOverlay} onClick={() => setMostrarFormularioCompleto(false)}>
          <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>✨ Nueva Factura Personalizada</h2>
              <button className={styles.closeButton} onClick={() => setMostrarFormularioCompleto(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <FormularioFacturaCompleto
                onSubmit={generarFacturaPersonalizada}
                onCancel={() => setMostrarFormularioCompleto(false)}
              />
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
