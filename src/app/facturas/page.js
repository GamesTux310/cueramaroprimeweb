'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './facturas.module.css';
import FormularioFacturaCompleto from '@/components/FormularioFacturaCompleto';
import { 
  getFacturas, 
  addFactura, 
  updateFactura, 
  deleteFactura, 
  getVentas, 
  getClientes 
} from '@/lib/storage';

export default function FacturasPage() {
  const [facturas, setFacturas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarModalGenerar, setMostrarModalGenerar] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarFormularioCompleto, setMostrarFormularioCompleto] = useState(false); // 🆕 Modal para factura personalizada
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
    setFacturas(getFacturas());
    setVentas(getVentas());
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

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrar facturas
  const facturasFiltradas = facturas.filter(factura => {
    const coincideBusqueda = 
      factura.numeroFactura.toLowerCase().includes(busqueda.toLowerCase()) ||
      factura.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase());

    const hoy = new Date();
    const fechaFactura = new Date(factura.fecha);
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

  // Estadísticas
  const totalFacturado = facturas.reduce((sum, f) => sum + f.total, 0);
  const facturasMes = facturas.filter(f => {
    const fecha = new Date(f.fecha);
    const hoy = new Date();
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  }).length;
  const facturasPendientes = facturas.filter(f => f.estado === 'pendiente').length;

  const seleccionarVenta = (venta) => {
    setVentaSeleccionada(venta);
    
    // Obtener cliente
    const clientes = getClientes();
    const cliente = clientes.find(c => c.id === venta.clienteId);

    // Preparar preview de factura
    const subtotal = venta.total;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const preview = {
      ventaId: venta.id,
      cliente: {
        nombre: cliente?.nombre || 'Cliente no encontrado',
        telefono: cliente?.telefono || '',
        direccion: cliente?.direccion || ''
      },
      productos: venta.productos,
      subtotal: subtotal,
      iva: iva,
      total: total,
      metodoPago: venta.metodoPago,
      estado: formData.estado,
      notas: formData.notas
    };

    setFacturaPreview(preview);
    setMostrarVistaPrevia(true);
  };

  const generarFactura = async () => {
    if (!facturaPreview) return;

    const nuevaFactura = addFactura(facturaPreview);
    setFacturas(getFacturas());
    
    // 🆕 Sincronizar con Google Sheets
    try {
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
 action: 'add',
          factura: nuevaFactura,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(`Factura ${nuevaFactura.numeroFactura} generada y sincronizada ✅`, 'success');
      } else {
        console.warn('Error al sincronizar con Google Sheets:', result.error);
        showToast(`Factura ${nuevaFactura.numeroFactura} generada (sin sincronizar)`, 'warning');
      }
    } catch (error) {
      console.error('Error de conexión con Google Sheets:', error);
      showToast(`Factura ${nuevaFactura.numeroFactura} generada (sin sincronizar)`, 'warning');
    }
    
    setMostrarVistaPrevia(false);
    setMostrarModalGenerar(false);
    setVentaSeleccionada(null);
    setFacturaPreview(null);
    setFormData({ estado: 'pagada', notas: '' });
  };

  const cambiarEstado = (factura) => {
    const nuevoEstado = factura.estado === 'pagada' ? 'pendiente' : 'pagada';
    updateFactura(factura.id, { estado: nuevoEstado });
    setFacturas(getFacturas());
    if (facturaSeleccionada?.id === factura.id) {
      setFacturaSeleccionada({ ...factura, estado: nuevoEstado });
    }
    showToast(`Estado actualizado a ${nuevoEstado}`, 'success');
  };

  // 🆕 Generar factura personalizada en Google Sheets
  const generarFacturaPersonalizada = async (datosFormulario) => {
    try {
      showToast('Generando factura en Google Sheets...', 'info');
      
      // Generar número de factura
      const facturas = getFacturas();
      const año = new Date().getFullYear();
      const numeroSecuencial = String(facturas.length + 1).padStart(3, '0');
      const numeroFactura = `F-${año}-${numeroSecuencial}`;
      
      // Preparar datos completos para Google Sheets
      const facturaCompleta = {
        ...datosFormulario,
        numeroFactura,
        fecha: datosFormulario.fechaEmision
      };
      
      // Enviar a Google Sheets
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createInvoiceSheet',
          factura: facturaCompleta,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Guardar también en localStorage
        addFactura({
          ...facturaCompleta,
          ventaId: null,
          estado: 'pagada',
          sheetUrl: result.url
        });
        
        setFacturas(getFacturas());
        setMostrarFormularioCompleto(false);
        showToast(`✅ Factura ${numeroFactura} generada en Google Sheets`, 'success');
        
        // Opcional: Abrir la hoja en nueva pestaña
        if (result.url) {
          window.open(result.url, '_blank');
        }
      } else {
        showToast(`❌ Error: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error al generar factura personalizada:', error);
      showToast('❌ Error al comunicarse con Google Sheets', 'error');
    }
  };

  const iniciarEliminacion = (factura) => {
    setFacturaAEliminar(factura);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && facturaAEliminar) {
      deleteFactura(facturaAEliminar.id);
      setFacturas(getFacturas());
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
                <p>Generación y gestión de facturas</p>
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
              title="Factura personalizada con plantilla de Google Sheets"
            >
              <span>✨</span> Factura Personalizada
            </button>
          </div>
        </div>
      </header>

      {/* Estadísticas */}
      <section className={styles.statsSection}>
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
            <span className={styles.statLabel}>Pendientes</span>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por número de factura o cliente..."
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
          <option value="pagada">✅ Pagadas</option>
          <option value="pendiente">⏳ Pendientes</option>
        </select>
      </section>

      {/* Grid de Facturas */}
      <section className={styles.facturasGrid}>
        {facturasFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            {facturas.length === 0 
              ? '📭 No hay facturas generadas. ¡Crea la primera!' 
              : '🔍 No se encontraron facturas con esos filtros'}
          </div>
        ) : (
          facturasFiltradas.map((factura) => (
            <div key={factura.id} className={styles.facturaCard}>
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
                  <span className={styles.clienteNombre}>{factura.cliente.nombre}</span>
                  <span className={styles.clienteTelefono}>📞 {factura.cliente.telefono}</span>
                </div>

                <div className={styles.productosResumen}>
                  <span>{factura.productos.length} producto(s)</span>
                </div>

                <div className={styles.totalFactura}>
                  <span>Total:</span>
                  <span className={styles.totalMonto}>{formatearMoneda(factura.total)}</span>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={styles.btnAction}
                  onClick={() => {
                    setFacturaSeleccionada(factura);
                    setMostrarDetalle(true);
                  }}
                  title="Ver detalle"
                >
                  📋
                </button>
                <button 
                  className={styles.btnAction}
                  onClick={() => cambiarEstado(factura)}
                  title={factura.estado === 'pagada' ? 'Marcar como pendiente' : 'Marcar como pagada'}
                >
                  {factura.estado === 'pagada' ? '⏳' : '✅'}
                </button>
                <button 
                  className={styles.btnAction}
                  onClick={() => iniciarEliminacion(factura)}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modal Generar Factura */}
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
                    const cliente = getClientes().find(c => c.id === venta.clienteId);
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

      {/* Modal Vista Previa */}
      {mostrarVistaPrevia && facturaPreview && (
        <div className={styles.modalOverlay} onClick={() => setMostrarVistaPrevia(false)}>
          <div className={`${styles.modal} ${styles.modalPreview}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>📄 Vista Previa de Factura</h2>
              <button className={styles.closeButton} onClick={() => setMostrarVistaPrevia(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.facturaPreview}>
                <div className={styles.previewHeader}>
                  <h1>Cueramaro Prime</h1>
                  <p>Sistema de Gestión de Ventas</p>
                </div>

                <div className={styles.previewInfo}>
                  <div>
                    <h3>Cliente:</h3>
                    <p><strong>{facturaPreview.cliente.nombre}</strong></p>
                    <p>📞 {facturaPreview.cliente.telefono}</p>
                    <p>📍 {facturaPreview.cliente.direccion}</p>
                  </div>
                  <div>
                    <h3>Fecha:</h3>
                    <p>{formatearFecha(new Date())}</p>
                  </div>
                </div>

                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturaPreview.productos.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.nombre}</td>
                        <td>{item.cantidad} {item.unidad}</td>
                        <td>{formatearMoneda(item.precio)}</td>
                        <td>{formatearMoneda(item.cantidad * item.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.previewTotales}>
                  <div className={styles.totalRow}>
                    <span>Subtotal:</span>
                    <span>{formatearMoneda(facturaPreview.subtotal)}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>IVA (16%):</span>
                    <span>{formatearMoneda(facturaPreview.iva)}</span>
                  </div>
                  <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                    <span>Total:</span>
                    <span>{formatearMoneda(facturaPreview.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setMostrarVistaPrevia(false)}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={generarFactura}>
                ✅ Generar Factura
              </button>
            </div>
          </div>
        </div>
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
                  <p><strong>{facturaSeleccionada.cliente.nombre}</strong></p>
                  <p>📞 {facturaSeleccionada.cliente.telefono}</p>
                  <p>📍 {facturaSeleccionada.cliente.direccion}</p>
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
                  {facturaSeleccionada.productos.map((item, idx) => (
                    <div key={idx} className={styles.productoDetalle}>
                      <span>{item.nombre} - {item.cantidad} {item.unidad}</span>
                      <span>{formatearMoneda(item.cantidad * item.precio)}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.detalleTotales}>
                  <div><span>Subtotal:</span> <span>{formatearMoneda(facturaSeleccionada.subtotal)}</span></div>
                  <div><span>IVA (16%):</span> <span>{formatearMoneda(facturaSeleccionada.iva)}</span></div>
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
                  • Cliente: {facturaAEliminar.cliente.nombre}<br/>
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
