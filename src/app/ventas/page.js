'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './ventas.module.css';
import { useVentasController } from '@/hooks/useVentasController';
import { InventoryService } from '@/lib/services/inventoryService';
import { BillingService } from '@/lib/services/billingService';
import { FacturaPreview } from '@/components/factura';
import { formatearMoneda, formatearNumero, parseDecimal } from '@/lib/numberToText';
import { ProductCatalog } from '@/components/ventas/ProductCatalog';
import { CustomerSelector } from '@/components/ventas/CustomerSelector';
import { POSShoppingCart } from '@/components/ventas/POSShoppingCart';
import { POSCheckoutPanel } from '@/components/ventas/POSCheckoutPanel';

export default function VentasPage() {
  const { state, actions } = useVentasController();

  // Desestructuración del State
  const {
    productos, clientes, ventas, clienteSeleccionado, carrito,
    metodoPago, tipoFactura, fechaVencimiento, direccionEntrega,
    busquedaCliente, busquedaProducto, filtroCategoria,
    mostrarClientes, mostrarHistorial, procesando, toast,
    facturaGenerada, mostrarFacturaPreview, ventaAEliminar,
    confirmarTexto, mostrarModalEliminar
  } = state;

  // Desestructuración de Actions
  const {
    setBusquedaCliente, setMostrarClientes, setBusquedaProducto,
    setFiltroCategoria, setMetodoPago, setTipoFactura,
    setFechaVencimiento, setMostrarHistorial, setMostrarFacturaPreview,
    setConfirmarTexto, seleccionarCliente, agregarAlCarrito,
    actualizarCantidad, eliminarDelCarrito, limpiarVenta,
    procesarVenta, iniciarEliminacion, confirmarEliminacion,
    cancelarEliminacion
  } = actions;

  // 1. Lógica Exclusiva de Vista (Filtros Renderizables)
  const clientesFiltrados = busquedaCliente.length > 0
    ? clientes.filter(c =>
      (c.nombre || '').toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      (c.telefono || '').includes(busquedaCliente)
    ).slice(0, 8)
    : clientes.slice(0, 8);

  const productosFiltrados = InventoryService.filtrarProductos(
    productos, busquedaProducto, filtroCategoria
  );

  const subtotal = BillingService.calcularSubtotal(carrito);
  const total = subtotal;

  const hoy = new Date();
  const ventasHoy = ventas.filter(v => {
    if (!v.fecha) return false;
    const fechaVenta = new Date(v.fecha);
    return fechaVenta.getFullYear() === hoy.getFullYear() &&
      fechaVenta.getMonth() === hoy.getMonth() &&
      fechaVenta.getDate() === hoy.getDate();
  });
  
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  const ventasContadoHoy = ventasHoy.filter(v => v.metodoPago === 'contado').reduce((sum, v) => sum + v.total, 0);
  const ventasCreditoHoy = ventasHoy.filter(v => v.metodoPago === 'credito').reduce((sum, v) => sum + v.total, 0);

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

            {/* 🆕 Filtros por Categoría */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Todas', 'Res', 'Cerdo', 'Pollo', 'Embutidos'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFiltroCategoria(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    background: filtroCategoria === cat ? '#1e40af' : '#fff',
                    color: filtroCategoria === cat ? '#fff' : '#374151',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s, color 0.2s',
                    boxShadow: filtroCategoria === cat ? '0 2px 4px rgba(30, 64, 175, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  {cat !== 'Todas' && InventoryService.getCategoriaIcon(cat)} {cat}
                </button>
              ))}
            </div>

            <ProductCatalog 
              productosFiltrados={productosFiltrados} 
              onAgregarAlCarrito={agregarAlCarrito} 
            />
          </div>

          {/* Panel del carrito */}
          <div className={styles.carritoPanel}>
            <CustomerSelector 
              clienteSeleccionado={clienteSeleccionado}
              busquedaCliente={busquedaCliente}
              mostrarClientes={mostrarClientes}
              clientesFiltrados={clientesFiltrados}
              onSeleccionarCliente={seleccionarCliente}
              onDeseleccionarCliente={() => seleccionarCliente(null)}
              onBusquedaChange={setBusquedaCliente}
              onMostrarClientesChange={setMostrarClientes}
            />

            <POSShoppingCart 
              carrito={carrito}
              onActualizarCantidad={actualizarCantidad}
              onEliminarDelCarrito={eliminarDelCarrito}
            />

            <POSCheckoutPanel
              metodoPago={metodoPago}
              tipoFactura={tipoFactura}
              fechaVencimiento={fechaVencimiento}
              direccionEntrega={direccionEntrega}
              clienteSeleccionado={clienteSeleccionado}
              subtotal={subtotal}
              total={total}
              procesando={procesando}
              carritoLength={carrito.length}
              onMetodoPagoChange={setMetodoPago}
              onTipoFacturaChange={setTipoFactura}
              onFechaVencimientoChange={setFechaVencimiento}
              onLimpiar={limpiarVenta}
              onProcesar={procesarVenta}
            />
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
                  <label>Escribe <strong>&quot;eliminar&quot;</strong> para confirmar:</label>
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
