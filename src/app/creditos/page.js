'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './creditos.module.css';
import { getClientes, getVentas, getAbonos, addAbono, updateCliente, getFacturas } from '@/lib/storage';
import FacturaPreview from '@/components/factura/FacturaPreview';

export default function CreditosPage() {
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarModalAbono, setMostrarModalAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  const [facturaParaAbono, setFacturaParaAbono] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    setClientes(getClientes());
    setVentas(getVentas());
    setAbonos(getAbonos());
    setFacturas(getFacturas());
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Filtrar solo clientes con saldo pendiente o con tipo crédito
  const clientesConCredito = clientes.filter(c => {
    if (filtroEstado === 'pendientes') return c.saldoPendiente > 0;
    if (filtroEstado === 'atrasados') return c.estado === 'atrasado';
    if (filtroEstado === 'aldia') return c.tipoCliente === 'credito' && c.saldoPendiente === 0;
    return c.tipoCliente === 'credito' || c.saldoPendiente > 0;
  });

  // Estadísticas
  const totalPendiente = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
  const clientesConSaldo = clientes.filter(c => c.saldoPendiente > 0).length;
  const abonosHoy = abonos.filter(a => new Date(a.fecha).toDateString() === new Date().toDateString());
  const totalAbonosHoy = abonosHoy.reduce((sum, a) => sum + a.monto, 0);

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cantidad);
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Sin registro';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Obtener facturas pendientes del cliente
  const getFacturasPendientesCliente = (clienteId) => {
    return facturas.filter(f => 
      f.cliente?.codigo === `CLI-${String(clienteId).padStart(3, '0')}` &&
      f.estado === 'pendiente'
    );
  };

  const iniciarAbono = (cliente) => {
    setClienteSeleccionado(cliente);
    setMontoAbono('');
    setMetodoPago('efectivo');
    setComprobanteFile(null);
    setComprobantePreview(null);
    setFacturaParaAbono(null); // Reset factura seleccionada
    setMostrarModalAbono(true);
  };

  // Manejar selección de comprobante
  const handleComprobanteChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setComprobanteFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprobantePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const procesarAbono = (e) => {
    e.preventDefault();
    
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) {
      showToast('Ingresa un monto válido', 'warning');
      return;
    }

    // Validar que se haya seleccionado una factura si hay facturas pendientes
    const facturasPendientes = getFacturasPendientesCliente(clienteSeleccionado.id);
    if (facturasPendientes.length > 0 && !facturaParaAbono) {
      showToast('Selecciona una factura/nota para aplicar el abono', 'warning');
      return;
    }

    // Validar que el monto no exceda el total de la factura seleccionada
    if (facturaParaAbono && monto > facturaParaAbono.total) {
      showToast('El monto excede el total de la factura seleccionada', 'error');
      return;
    }

    if (monto > clienteSeleccionado.saldoPendiente) {
      showToast('El monto excede el saldo pendiente', 'error');
      return;
    }

    const abonoData = {
      clienteId: clienteSeleccionado.id,
      clienteNombre: clienteSeleccionado.nombre,
      monto,
      metodoPago,
      saldoAnterior: clienteSeleccionado.saldoPendiente,
      saldoNuevo: clienteSeleccionado.saldoPendiente - monto,
      comprobanteURL: comprobantePreview || null,
      // Nueva información de la factura asociada
      facturaAsociadaId: facturaParaAbono?.id || null,
      facturaAsociadaNumero: facturaParaAbono?.numeroFactura || null
    };

    const abonoRegistrado = addAbono(abonoData);

    // Limpiar estado
    cargarDatos();
    setMostrarModalAbono(false);
    setClienteSeleccionado(null);
    setComprobanteFile(null);
    setComprobantePreview(null);
    setFacturaParaAbono(null);
    
    const mensajeFactura = facturaParaAbono 
      ? `aplicado a ${facturaParaAbono.numeroFactura}` 
      : `Factura: ${abonoRegistrado.numeroFactura}`;
    showToast(`Abono de ${formatearMoneda(monto)} registrado - ${mensajeFactura}`, 'success');
  };

  const getEstadoBadge = (cliente) => {
    if (cliente.saldoPendiente === 0) {
      return { text: 'Al día', class: 'aldia', icon: '✅' };
    }
    if (cliente.estado === 'atrasado') {
      return { text: 'Atrasado', class: 'atrasado', icon: '⚠️' };
    }
    return { text: 'Pendiente', class: 'pendiente', icon: '⏳' };
  };

  // Obtener historial de abonos del cliente seleccionado
  const historialCliente = clienteSeleccionado 
    ? abonos.filter(a => a.clienteId === clienteSeleccionado.id).slice().reverse()
    : [];

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
                <span className={styles.headerIcon}>💳</span>
                <div>
                  <h1>Créditos y Abonos</h1>
                  <p>Gestiona los saldos y pagos de clientes</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Estadísticas */}
        <section className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              💰
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{formatearMoneda(totalPendiente)}</span>
              <span className={styles.statLabel}>Total Pendiente</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              👥
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{clientesConSaldo}</span>
              <span className={styles.statLabel}>Clientes con Saldo</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              📥
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{formatearMoneda(totalAbonosHoy)}</span>
              <span className={styles.statLabel}>Abonos Hoy</span>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className={styles.filtrosSection}>
          <div className={styles.filtroTabs}>
            {[
              { id: 'todos', label: '📋 Todos' },
              { id: 'pendientes', label: '⏳ Pendientes' },
              { id: 'atrasados', label: '⚠️ Atrasados' },
              { id: 'aldia', label: '✅ Al Día' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`${styles.filtroTab} ${filtroEstado === tab.id ? styles.active : ''}`}
                onClick={() => setFiltroEstado(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Lista de Clientes */}
        <section className={styles.listaSection}>
          {clientesConCredito.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No hay clientes con crédito en esta categoría</p>
            </div>
          ) : (
            <div className={styles.clientesList}>
              {clientesConCredito.map((cliente) => {
                const estado = getEstadoBadge(cliente);
                return (
                  <div key={cliente.id} className={styles.clienteItem}>
                    <div className={styles.clienteAvatar}>
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.clienteInfo}>
                      <span className={styles.clienteNombre}>{cliente.nombre}</span>
                      <span className={styles.clienteMeta}>
                        📞 {cliente.telefono} • Última compra: {formatearFecha(cliente.ultimaCompra)}
                      </span>
                    </div>
                    <div className={styles.clienteSaldo}>
                      <span className={styles.saldoAmount}>{formatearMoneda(cliente.saldoPendiente)}</span>
                      <span className={`${styles.estadoBadge} ${styles[estado.class]}`}>
                        {estado.icon} {estado.text}
                      </span>
                    </div>
                    <div className={styles.clienteActions}>
                      {cliente.saldoPendiente > 0 && (
                        <button 
                          className={styles.btnAbono}
                          onClick={() => iniciarAbono(cliente)}
                        >
                          💵 Registrar Abono
                        </button>
                      )}
                      <button 
                        className={styles.btnHistorial}
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                        }}
                      >
                        📋
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal Registrar Abono */}
        {mostrarModalAbono && clienteSeleccionado && (
          <div className={styles.modalOverlay} onClick={() => setMostrarModalAbono(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>💵 Registrar Abono</h2>
                <button className={styles.closeButton} onClick={() => setMostrarModalAbono(false)}>
                  ✕
                </button>
              </div>
              <form onSubmit={procesarAbono} className={styles.modalBody}>
                <div className={styles.clienteResumen}>
                  <div className={styles.clienteResumeAvatar}>
                    {clienteSeleccionado.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{clienteSeleccionado.nombre}</h3>
                    <p>Saldo Pendiente: <strong>{formatearMoneda(clienteSeleccionado.saldoPendiente)}</strong></p>
                  </div>
                </div>

                {/* Selector de Factura */}
                <div className={styles.formGroup}>
                  <label>📄 Seleccionar Factura/Nota a Abonar</label>
                  <div className={styles.facturasList}>
                    {getFacturasPendientesCliente(clienteSeleccionado.id).length === 0 ? (
                      <div className={styles.noFacturas}>
                        <span>📭</span>
                        <p>No hay facturas pendientes</p>
                      </div>
                    ) : (
                      getFacturasPendientesCliente(clienteSeleccionado.id).map(factura => (
                        <div 
                          key={factura.id}
                          className={`${styles.facturaOption} ${facturaParaAbono?.id === factura.id ? styles.selected : ''}`}
                          onClick={() => {
                            setFacturaParaAbono(factura);
                            // Auto-establecer el monto total de la factura si no hay monto
                            if (!montoAbono) {
                              setMontoAbono(String(factura.total));
                            }
                          }}
                        >
                          <div className={styles.facturaOptionInfo}>
                            <span className={styles.facturaNumero}>{factura.numeroFactura}</span>
                            <span className={styles.facturaFecha}>{formatearFecha(factura.fecha)}</span>
                          </div>
                          <div className={styles.facturaOptionMonto}>
                            <span className={styles.montoTotal}>{formatearMoneda(factura.total)}</span>
                            <span className={styles.tipoFactura}>
                              {factura.tipoFactura === 'credito' ? '📅 Crédito' : '⚡ Débito'}
                            </span>
                          </div>
                          {facturaParaAbono?.id === factura.id && (
                            <span className={styles.checkmark}>✓</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Monto del Abono</label>
                  <div className={styles.montoInput}>
                    <span className={styles.montoPrefix}>$</span>
                    <input
                      type="number"
                      value={montoAbono}
                      onChange={(e) => setMontoAbono(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      max={facturaParaAbono ? facturaParaAbono.total : clienteSeleccionado.saldoPendiente}
                      step="0.01"
                      autoFocus
                      required
                    />
                  </div>
                  <div className={styles.montosRapidos}>
                    {[100, 500, 1000].map(monto => (
                      <button
                        key={monto}
                        type="button"
                        className={styles.montoRapido}
                        onClick={() => setMontoAbono(String(Math.min(monto, facturaParaAbono?.total || clienteSeleccionado.saldoPendiente)))}
                      >
                        ${monto}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`${styles.montoRapido} ${styles.montoTotal}`}
                      onClick={() => setMontoAbono(String(facturaParaAbono?.total || clienteSeleccionado.saldoPendiente))}
                    >
                      Total
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Método de Pago</label>
                  <div className={styles.metodoPagoOptions}>
                    {[
                      { id: 'efectivo', label: '💵 Efectivo' },
                      { id: 'tarjeta', label: '💳 Tarjeta' },
                      { id: 'transferencia', label: '🏦 Transferencia' },
                    ].map(metodo => (
                      <button
                        key={metodo.id}
                        type="button"
                        className={`${styles.metodoPagoBtn} ${metodoPago === metodo.id ? styles.active : ''}`}
                        onClick={() => setMetodoPago(metodo.id)}
                      >
                        {metodo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comprobante de pago para transferencia/tarjeta */}
                {(metodoPago === 'transferencia' || metodoPago === 'tarjeta') && (
                  <div className={styles.formGroup}>
                    <label>📷 Comprobante de Pago (opcional)</label>
                    <div className={styles.comprobanteUpload}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleComprobanteChange}
                        id="comprobante-input"
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="comprobante-input" className={styles.uploadLabel}>
                        {comprobantePreview ? (
                          <img src={comprobantePreview} alt="Comprobante" className={styles.comprobantePreview} />
                        ) : (
                          <>
                            <span className={styles.uploadIcon}>📤</span>
                            <span>Adjuntar comprobante</span>
                          </>
                        )}
                      </label>
                      {comprobantePreview && (
                        <button 
                          type="button" 
                          className={styles.btnRemoveComprobante}
                          onClick={() => { setComprobanteFile(null); setComprobantePreview(null); }}
                        >
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {montoAbono && (
                  <div className={styles.resumenAbono}>
                    <div className={styles.resumenRow}>
                      <span>Saldo actual:</span>
                      <span>{formatearMoneda(clienteSeleccionado.saldoPendiente)}</span>
                    </div>
                    <div className={styles.resumenRow}>
                      <span>Abono:</span>
                      <span className={styles.abonoMonto}>- {formatearMoneda(parseFloat(montoAbono) || 0)}</span>
                    </div>
                    <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
                      <span>Nuevo saldo:</span>
                      <span>{formatearMoneda(clienteSeleccionado.saldoPendiente - (parseFloat(montoAbono) || 0))}</span>
                    </div>
                  </div>
                )}

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className={styles.btnCancelar}
                    onClick={() => setMostrarModalAbono(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className={styles.btnGuardar}
                    disabled={!montoAbono || parseFloat(montoAbono) <= 0}
                  >
                    ✓ Confirmar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Historial de Abonos */}
        {clienteSeleccionado && !mostrarModalAbono && (
          <div className={styles.modalOverlay} onClick={() => setClienteSeleccionado(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>📋 Historial de {clienteSeleccionado.nombre}</h2>
                <button className={styles.closeButton} onClick={() => setClienteSeleccionado(null)}>
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.saldoActual}>
                  <span>Saldo Actual:</span>
                  <span className={styles.saldoMonto}>{formatearMoneda(clienteSeleccionado.saldoPendiente)}</span>
                </div>
                
                {clienteSeleccionado.saldoPendiente > 0 && (
                  <button 
                    className={styles.btnAbonoGrande}
                    onClick={() => setMostrarModalAbono(true)}
                  >
                    💵 Registrar Nuevo Abono
                  </button>
                )}

                <h4 className={styles.historialTitulo}>Historial de Abonos</h4>
                
                {historialCliente.length === 0 ? (
                  <div className={styles.emptyHistorial}>
                    <span>📭</span>
                    <p>No hay abonos registrados</p>
                  </div>
                ) : (
                  <div className={styles.historialList}>
                    {historialCliente.map((abono) => (
                      <div key={abono.id} className={styles.historialItem}>
                        <div className={styles.historialIcon}>💵</div>
                        <div className={styles.historialInfo}>
                          <span className={styles.historialMonto}>{formatearMoneda(abono.monto)}</span>
                          <span className={styles.historialFecha}>{formatearFecha(abono.fecha)}</span>
                          {abono.numeroFactura && (
                            <span className={styles.historialFactura}>📄 {abono.numeroFactura}</span>
                          )}
                        </div>
                        <div className={styles.historialRight}>
                          <span className={styles.historialMetodo}>
                            {abono.metodoPago === 'efectivo' ? '💵' : abono.metodoPago === 'tarjeta' ? '💳' : '🏦'}
                          </span>
                          {abono.comprobanteURL && (
                            <img 
                              src={abono.comprobanteURL} 
                              alt="Comprobante" 
                              className={styles.miniaturaComprobante}
                              onClick={() => window.open(abono.comprobanteURL, '_blank')}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Facturas del cliente */}
                <h4 className={styles.historialTitulo} style={{ marginTop: '20px' }}>📄 Facturas del Cliente</h4>
                {(() => {
                  const facturasCliente = facturas.filter(f => 
                    f.cliente?.codigo === `CLI-${String(clienteSeleccionado.id).padStart(3, '0')}`
                  );
                  return facturasCliente.length === 0 ? (
                    <div className={styles.emptyHistorial}>
                      <span>📭</span>
                      <p>No hay facturas registradas</p>
                    </div>
                  ) : (
                    <div className={styles.historialList}>
                      {facturasCliente.slice().reverse().map((factura) => (
                        <div 
                          key={factura.id} 
                          className={`${styles.historialItem} ${styles.clickable}`}
                          onClick={() => setFacturaSeleccionada(factura)}
                        >
                          <div className={styles.historialIcon}>
                            {factura.tipoFactura === 'abono' ? '💵' : '🧾'}
                          </div>
                          <div className={styles.historialInfo}>
                            <span className={styles.historialMonto}>{formatearMoneda(factura.total)}</span>
                            <span className={styles.historialFecha}>{formatearFecha(factura.fecha)}</span>
                            <span className={styles.historialFactura}>{factura.numeroFactura}</span>
                          </div>
                          <div className={styles.historialRight}>
                            <span className={`${styles.estadoBadge} ${factura.estado === 'pagado' ? styles.aldia : styles.pendiente}`}>
                              {factura.estado === 'pagado' ? '✅' : '⏳'} {factura.estado}
                            </span>
                            <span className={styles.verFactura}>👁️</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal Vista Previa de Factura */}
        {facturaSeleccionada && (
          <FacturaPreview 
            factura={facturaSeleccionada}
            onClose={() => setFacturaSeleccionada(null)}
          />
        )}
      </main>
    </>
  );
}
