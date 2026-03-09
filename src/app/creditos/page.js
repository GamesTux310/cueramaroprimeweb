'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './creditos.module.css';
import { getClientes, getVentas, getAbonos, addAbono, updateCliente, getFacturas } from '@/lib/storage';
import FacturaPreview from '@/components/factura/FacturaPreview';
import ActivityCalendar from '@/components/ActivityCalendar';
import ImageModal from '@/components/ImageModal';
import ImageDropzone from '@/components/ImageDropzone';

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
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [detalleAbono, setDetalleAbono] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setClientes(await getClientes());
    setVentas(await getVentas());
    setAbonos(await getAbonos());
    setFacturas(await getFacturas());
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Filtrar solo clientes con saldo pendiente o con tipo crédito
  // Ordenar por última compra (más reciente primero)
  const clientesConCredito = clientes
    .filter(c => {
      if (filtroEstado === 'pendientes') return c.saldoPendiente > 0;
      if (filtroEstado === 'atrasados') return c.estado === 'atrasado';
      if (filtroEstado === 'aldia') return c.tipoCliente === 'credito' && c.saldoPendiente === 0;
      return c.tipoCliente === 'credito' || c.saldoPendiente > 0;
    })
    .sort((a, b) => {
      // Ordenar por ultimaCompra descendente (más reciente primero)
      const parsearFechaSort = (f) => {
        if (!f) return new Date(0);
        if (f.indexOf('T') > -1) return new Date(f);
        const [y, m, d] = f.split('-');
        return new Date(y, m - 1, d);
      };
      
      const fechaA = parsearFechaSort(a.ultimaCompra);
      const fechaB = parsearFechaSort(b.ultimaCompra);
      return fechaB - fechaA;
    });

  // Estadísticas
  const totalPendiente = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
  const clientesConSaldo = clientes.filter(c => c.saldoPendiente > 0).length;
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
  
  const abonosHoy = abonos.filter(a => parsearFecha(a.fecha).toDateString() === new Date().toDateString());
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
    const fecha = parsearFecha(fechaISO);
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

  const handleComprobanteChange = (base64) => {
    setComprobantePreview(base64);
  };

  const procesarAbono = async (e) => {
    e.preventDefault();
    
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) {
      showToast('Ingresa un monto válido', 'warning');
      return;
    }

    // Validar contra el saldo de la factura seleccionada o el saldo general
    if (facturaParaAbono) {
      const saldoFactura = facturaParaAbono.saldoPendiente !== undefined ? facturaParaAbono.saldoPendiente : facturaParaAbono.total;
      if (monto > saldoFactura) {
        showToast('El monto excede el saldo de la factura seleccionada', 'error');
        return;
      }
    } else if (monto > clienteSeleccionado.saldoPendiente) {
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
      facturaId: facturaParaAbono ? facturaParaAbono.id : null,
    };

    const abonoRegistrado = await addAbono(abonoData);

    // Limpiar estado
    await cargarDatos();
    setMostrarModalAbono(false);
    setClienteSeleccionado(null);
    setComprobanteFile(null);
    setComprobantePreview(null);
    setFacturaParaAbono(null);
    
    const mensajeFactura = abonoRegistrado.facturasAfectadas?.length > 0
      ? `Aplicado a: ${abonoRegistrado.facturasAfectadas.join(', ')}` 
      : `Recibo: ${abonoRegistrado.numeroFactura}`;
    showToast(`Abono de ${formatearMoneda(monto)} registrado. ${mensajeFactura}`, 'success');
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

      {/* Modal Detalle Abono */}
      {detalleAbono && (
        <div className={styles.modalOverlay} onClick={() => setDetalleAbono(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>💵 Detalle del Abono</h2>
              <button className={styles.closeButton} onClick={() => setDetalleAbono(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Fecha:</span>
                <span>{new Date(detalleAbono.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Monto:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>
                  {formatearMoneda(detalleAbono.monto)}
                </span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Método:</span>
                <span style={{ textTransform: 'capitalize' }}>{detalleAbono.metodoPago}</span>
              </div>
              {detalleAbono.numeroFactura && (
                 <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>Factura:</span>
                  <span>{detalleAbono.numeroFactura}</span>
                </div>
              )}
              {detalleAbono.comprobanteURL && (
                <div className={styles.detalleRow} style={{ marginTop: '15px' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>📸 Comprobante / Evidencia:</span>
                  <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <img 
                      src={detalleAbono.comprobanteURL} 
                      alt="Comprobante" 
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => setImagenAmpliada(detalleAbono.comprobanteURL)}
                    />
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                      Clic para ampliar
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Imagen Ampliada */}
      {imagenAmpliada && (
        <ImageModal 
          imageUrl={imagenAmpliada} 
          onClose={() => setImagenAmpliada(null)} 
        />
      )}

      {/* Modal de Calendario de Actividad */}
      {mostrarCalendario && (
        <ActivityCalendar
          type="abonos"
          onClose={() => setMostrarCalendario(false)}
          onActivityClick={(abono) => {
            setDetalleAbono(abono);
          }}
        />
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
            <button
              className={styles.btnCalendario}
              onClick={() => setMostrarCalendario(true)}
              style={{ 
                padding: '12px 24px', 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: '600', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📅</span> Calendario
            </button>
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
                      {cliente.avatarURL ? (
                        <img 
                          src={cliente.avatarURL} 
                          alt={cliente.nombre} 
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        cliente.nombre.charAt(0).toUpperCase()
                      )}
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
              <div className={styles.modalBody}>
                <form id="form-abono-cliente" onSubmit={procesarAbono}>
                <div className={styles.clienteResumen}>
                  <div className={styles.clienteResumeAvatar}>
                    {clienteSeleccionado.avatarURL ? (
                        <img 
                          src={clienteSeleccionado.avatarURL} 
                          alt={clienteSeleccionado.nombre} 
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        clienteSeleccionado.nombre.charAt(0).toUpperCase()
                      )}
                  </div>
                  <div>
                    <h3>{clienteSeleccionado.nombre}</h3>
                    <p>Saldo Pendiente: <strong>{formatearMoneda(clienteSeleccionado.saldoPendiente)}</strong></p>
                  </div>
                </div>

                {/* SELECTOR DE FACTURA PARA ABONAR */}
                <div className={styles.formGroup}>
                  <label>📄 Aplicar abono a:</label>
                  {(() => {
                    const pendientes = getFacturasPendientesCliente(clienteSeleccionado.id)
                      .filter(f => f.tipoFactura !== 'abono')
                      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                        {/* Opción FIFO automático */}
                        <div
                          onClick={() => { setFacturaParaAbono(null); setMontoAbono(''); }}
                          style={{
                            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                            border: `2px solid ${!facturaParaAbono ? '#6366f1' : '#e5e7eb'}`,
                            background: !facturaParaAbono ? 'rgba(99,102,241,0.08)' : 'white',
                            fontSize: '0.85rem', fontWeight: !facturaParaAbono ? '700' : '500'
                          }}
                        >
                          🔄 A cuenta general (automático)
                        </div>
                        {/* Facturas pendientes individuales */}
                        {pendientes.map(f => {
                          const saldo = f.saldoPendiente !== undefined ? f.saldoPendiente : f.total;
                          const sel = facturaParaAbono?.id === f.id;
                          return (
                            <div
                              key={f.id}
                              onClick={() => { setFacturaParaAbono(f); setMontoAbono(String(saldo.toFixed(2))); }}
                              style={{
                                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                border: `2px solid ${sel ? '#6366f1' : '#e5e7eb'}`,
                                background: sel ? 'rgba(99,102,241,0.08)' : 'white',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: '0.85rem', fontWeight: sel ? '700' : '500'
                              }}
                            >
                              <span>🧾 {f.numeroFactura} — {formatearFecha(f.fecha)}</span>
                              <span style={{ color: '#ef4444', fontWeight: '700' }}>Debe: {formatearMoneda(saldo)}</span>
                            </div>
                          );
                        })}
                        {pendientes.length === 0 && (
                          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '10px', fontSize: '0.85rem' }}>
                            No hay facturas pendientes individuales
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                      max={facturaParaAbono ? (facturaParaAbono.saldoPendiente !== undefined ? facturaParaAbono.saldoPendiente : facturaParaAbono.total) : clienteSeleccionado.saldoPendiente}
                      step="0.01"
                      autoFocus
                      required
                    />
                  </div>
                  <div className={styles.montosRapidos}>
                    {[100, 500, 1000].map(monto => {
                      const maxAbono = facturaParaAbono ? (facturaParaAbono.saldoPendiente !== undefined ? facturaParaAbono.saldoPendiente : facturaParaAbono.total) : clienteSeleccionado.saldoPendiente;
                      return (
                        <button
                          key={monto}
                          type="button"
                          className={styles.montoRapido}
                          onClick={() => setMontoAbono(String(Math.min(monto, maxAbono)))}
                        >
                          ${monto}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={`${styles.montoRapido} ${styles.montoTotal}`}
                      onClick={() => {
                        const maxAbono = facturaParaAbono ? (facturaParaAbono.saldoPendiente !== undefined ? facturaParaAbono.saldoPendiente : facturaParaAbono.total) : clienteSeleccionado.saldoPendiente;
                        setMontoAbono(String(maxAbono));
                      }}
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

                {/* Comprobante de pago (Opcional para todos, Recomendado para todos) */}
                <div className={styles.formGroup}>
                  <label>📷 Comprobante / Evidencia (opcional)</label>
                    <ImageDropzone 
                      onImageSave={handleComprobanteChange} 
                      previewUrl={comprobantePreview} 
                      onRemove={() => setComprobantePreview(null)} 
                    />
                  </div>

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

                </form>
              </div>
              <div className={styles.modalFooter}>
                <button 
                  type="button" 
                  className={styles.btnCancelar}
                  onClick={() => setMostrarModalAbono(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="form-abono-cliente"
                  className={styles.btnGuardar}
                  disabled={!montoAbono || parseFloat(montoAbono) <= 0}
                >
                  ✓ Confirmar Abono
                </button>
              </div>
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
                {/* 🆕 Alertas de Atraso (Morosidad) */}
                {(() => {
                  const facturasPendientes = facturas.filter(f => 
                    f.cliente?.codigo === `CLI-${String(clienteSeleccionado.id).padStart(3, '0')}` &&
                    f.estado === 'pendiente' && f.tipoFactura !== 'abono'
                  );
                  
                  const hoy = new Date();
                  const facturasAtrasadas = facturasPendientes.map(f => {
                    // Asumimos 30 días de crédito si no hay fechaVencimiento explícita
                    const fechaVencimiento = f.fechaVencimiento ? new Date(f.fechaVencimiento) : new Date(new Date(f.fecha).setDate(new Date(f.fecha).getDate() + 30));
                    const diasAtraso = Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24));
                    return { ...f, diasAtraso, fechaVencimiento };
                  }).filter(f => f.diasAtraso > 0);

                  if (facturasAtrasadas.length === 0) return null;

                  return (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px',
                      padding: '12px', marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#b91c1c', fontWeight: 'bold' }}>
                        <span>⚠️</span> <span>Alertas de Atraso ({facturasAtrasadas.length} facturas vencidas)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {facturasAtrasadas.map(f => (
                          <div key={`alerta-${f.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>📄 {f.numeroFactura} - Venció el {formatearFecha(f.fechaVencimiento)}</span>
                            <span style={{ color: '#ef4444', fontWeight: 'bold', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                              {f.diasAtraso} días de atraso
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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
                      <div 
                        key={abono.id} 
                        className={`${styles.historialItem} ${styles.clickable}`}
                        onClick={() => {
                          const facturaAbonoCompleta = facturas.find(f => f.abonoId === abono.id || f.numeroAbono === abono.numeroAbono);
                          if (facturaAbonoCompleta) {
                            setFacturaSeleccionada(facturaAbonoCompleta);
                          } else {
                            setDetalleAbono(abono);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setImagenAmpliada(abono.comprobanteURL);
                              }}
                            />
                          )}
                          <div 
                            style={{
                              marginLeft: '10px',
                              padding: '4px 8px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              color: '#334155',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            📄 Ver
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Facturas del cliente con Historial Granular y Trazabilidad */}
                <h4 className={styles.historialTitulo} style={{ marginTop: '20px' }}>📄 Facturas del Cliente</h4>
                {(() => {
                  const facturasCliente = facturas.filter(f => 
                    f.cliente?.codigo === `CLI-${String(clienteSeleccionado.id).padStart(3, '0')}` && f.tipoFactura !== 'abono'
                  ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                  return facturasCliente.length === 0 ? (
                    <div className={styles.emptyHistorial}>
                      <span>📭</span>
                      <p>No hay facturas registradas</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {facturasCliente.map((factura) => {
                        // Trazabilidad: Filtrar abonos vinculados explícitamente a esta factura
                        const abonosFactura = historialCliente.filter(a => 
                          a.facturasAfectadas?.includes(factura.id) || a.numeroFactura === factura.numeroFactura
                        );
                        
                        const totalAbonado = abonosFactura.reduce((sum, a) => sum + a.monto, 0);
                        const valorTotal = factura.total || 0;
                        const restante = Math.max(0, valorTotal - totalAbonado);
                        const estaPagada = restante <= 0.01; // Tolerancia de decimales

                        return (
                          <div key={factura.id} style={{
                            border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: estaPagada ? '#f9fafb' : '#ffffff'
                          }}>
                            {/* Cabecera de la factura */}
                            <div 
                              className={styles.clickable}
                              style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: abonosFactura.length > 0 ? '1px solid #e5e7eb' : 'none' }}
                              onClick={() => setFacturaSeleccionada({ ...factura, tipoFactura: factura.tipoFactura || 'credito' })}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '1.5rem' }}>🧾</span>
                                <div>
                                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{factura.numeroFactura}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatearFecha(factura.fecha)}</div>
                                </div>
                              </div>
                              
                              <div style={{ textAlign: 'right' }}>
                                {/* Desglose Matemático Granular */}
                                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end', marginRight: '15px' }}>
                                  <div><span style={{ color: '#6b7280' }}>Original:</span> <b>{formatearMoneda(valorTotal)}</b></div>
                                  {totalAbonado > 0 && <div style={{ color: '#10b981' }}><span>Abonado:</span> -{formatearMoneda(totalAbonado)}</div>}
                                  {!estaPagada && <div style={{ color: '#ef4444', borderTop: '1px solid #e5e7eb', marginTop: '2px', paddingTop: '2px' }}>
                                    <span>Restante:</span> <b>{formatearMoneda(restante)}</b>
                                  </div>}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={`${styles.estadoBadge} ${estaPagada ? styles.aldia : styles.pendiente}`}>
                                  {estaPagada ? '✅ Pagado' : '⏳ Pendiente'}
                                </span>
                                <span 
                                  className={styles.verFactura}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFacturaSeleccionada({ ...factura, tipoFactura: factura.tipoFactura || 'credito' });
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  📄 Ver
                                </span>
                              </div>
                            </div>

                            {/* Trazabilidad de pagos parciales debajo de la factura */}
                            {abonosFactura.length > 0 && (
                              <div style={{ background: '#f8fafc', padding: '10px 12px 10px 30px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Pagos Aplicados:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {abonosFactura.map(abono => (
                                    <div key={abono.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                                        <span style={{ color: '#475569' }}>{formatearFecha(abono.fecha)}</span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                          ({abono.metodoPago === 'efectivo' ? '💵 Efectivo' : abono.metodoPago === 'tarjeta' ? '💳 Tarjeta' : '🏦 Transf.'})
                                        </span>
                                      </div>
                                      <span style={{ fontWeight: '600', color: '#059669' }}>
                                        +{formatearMoneda(abono.monto)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
