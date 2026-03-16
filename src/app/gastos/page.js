'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './gastos.module.css';
import { getGastos, addGasto, deleteGasto } from '@/lib/storage';
import { uploadImage } from '@/lib/storageService';
import ImageModal from '@/components/ImageModal';
import ImageDropzone from '@/components/ImageDropzone';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import localforage from 'localforage';

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoy');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Estado para eliminación
  const [gastoAEliminar, setGastoAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  // Estado para ver detalle de gasto
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  
  // Estado para modal de historial
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  
  // Estado para imagen ampliada
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // Formulario
  const [formData, setFormData] = useState({
    descripcion: '',
    categoria: 'operacion',
    monto: '',
    metodoPago: 'efectivo',
    notas: '',
    imagenComprobante: null // Nueva: imagen del comprobante
  });
  
  // Estado para drag & drop
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // 🆕 Gastos Fijos
  const [gastosFijos, setGastosFijos] = useState([]);
  const [mostrarFormGastoFijo, setMostrarFormGastoFijo] = useState(false);
  const [formGastoFijo, setFormGastoFijo] = useState({ nombre: '', monto: '', categoria: 'servicios' });

  const categorias = [
    { id: 'operacion', nombre: 'Operación', icon: '⚙️', color: '#6366f1' },
    { id: 'servicios', nombre: 'Servicios', icon: '💡', color: '#f59e0b' },
    { id: 'compras', nombre: 'Compras/Mercancía', icon: '📦', color: '#10b981' },
    { id: 'nomina', nombre: 'Nómina', icon: '👥', color: '#8b5cf6' },
    { id: 'transporte', nombre: 'Transporte', icon: '🚚', color: '#ec4899' },
    { id: 'mantenimiento', nombre: 'Mantenimiento', icon: '🔧', color: '#14b8a6' },
    { id: 'otros', nombre: 'Otros', icon: '📋', color: '#64748b' },
  ];

  // Cargar gastos y escuchar cambios
  useEffect(() => {
    const cargarGastos = async () => {
      setGastos(await getGastos());
    };

    cargarGastos();

    window.addEventListener('cueramaro_data_updated', cargarGastos);
    return () => window.removeEventListener('cueramaro_data_updated', cargarGastos);
  }, []);

  // Cargar gastos fijos
  useEffect(() => {
    const cargarGastosFijos = async () => {
      const data = await localforage.getItem('gastosFijos');
      setGastosFijos(data || []);
    };
    cargarGastosFijos();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Filtrar gastos
  const hoy = new Date();
  const gastosFiltrados = gastos.filter(g => {
    const fechaGasto = new Date(g.fecha);
    
    // Filtro por periodo
    let dentroDelPeriodo = true;
    if (filtroPeriodo === 'hoy') {
      dentroDelPeriodo = fechaGasto.toDateString() === hoy.toDateString();
    } else if (filtroPeriodo === 'semana') {
      const hace7Dias = new Date(hoy);
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      dentroDelPeriodo = fechaGasto >= hace7Dias;
    } else if (filtroPeriodo === 'mes') {
      dentroDelPeriodo = fechaGasto.getMonth() === hoy.getMonth() && 
                         fechaGasto.getFullYear() === hoy.getFullYear();
    }
    
    // Filtro por categoría
    const coincideCategoria = filtroCategoria === 'todos' || g.categoria === filtroCategoria;
    
    return dentroDelPeriodo && coincideCategoria;
  });

  // Calcular totales
  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
  const gastosHoy = gastos.filter(g => new Date(g.fecha).toDateString() === hoy.toDateString());
  const totalHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0);

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cantidad);
  };

  const formatearFecha = (fechaISO) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoriaInfo = (categoriaId) => {
    return categorias.find(c => c.id === categoriaId) || categorias[categorias.length - 1];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.descripcion || !formData.monto) {
      showToast('Completa los campos requeridos', 'warning');
      return;
    }

    const nuevoGasto = await addGasto({
      ...formData,
      monto: parseFloat(formData.monto)
    });

    setGastos(await getGastos());
    setFormData({
      descripcion: '',
      categoria: 'operacion',
      monto: '',
      metodoPago: 'efectivo',
      notas: '',
      imagenComprobante: null
    });
    setMostrarFormulario(false);
    showToast(`Gasto de ${formatearMoneda(nuevoGasto.monto)} registrado`, 'success');
  };

  const handleImagenChange = (base64) => {
    setFormData(prev => ({ ...prev, imagenComprobante: base64 }));
  };

  const eliminarImagen = () => {
    setFormData(prev => ({ ...prev, imagenComprobante: null }));
  };

  // Funciones de eliminación
  const iniciarEliminacion = (gasto) => {
    setGastoAEliminar(gasto);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = async () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && gastoAEliminar) {
      await deleteGasto(gastoAEliminar.id);
      setGastos(await getGastos());
      setMostrarModalEliminar(false);
      setGastoAEliminar(null);
      setConfirmarTexto('');
      showToast(`Gasto eliminado`, 'success');
    }
  };

  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setGastoAEliminar(null);
    setConfirmarTexto('');
  };

  // 🆕 Funciones CRUD de Gastos Fijos
  const agregarGastoFijo = async () => {
    if (!formGastoFijo.nombre || !formGastoFijo.monto) return;
    const nuevo = { id: Date.now(), ...formGastoFijo, monto: parseFloat(formGastoFijo.monto) };
    const actualizados = [...gastosFijos, nuevo];
    setGastosFijos(actualizados);
    await localforage.setItem('gastosFijos', actualizados);
    setFormGastoFijo({ nombre: '', monto: '', categoria: 'servicios' });
    setMostrarFormGastoFijo(false);
    showToast('Gasto fijo agregado', 'success');
  };

  const eliminarGastoFijo = async (id) => {
    const actualizados = gastosFijos.filter(g => g.id !== id);
    setGastosFijos(actualizados);
    await localforage.setItem('gastosFijos', actualizados);
    showToast('Gasto fijo eliminado', 'success');
  };

  const renovarGastoFijo = async (gastoFijo) => {
    await addGasto({
      descripcion: `${gastoFijo.nombre} (Fijo mensual)`,
      categoria: gastoFijo.categoria,
      monto: gastoFijo.monto,
      metodoPago: 'efectivo',
      notas: 'Gasto fijo renovado'
    });
    setGastos(await getGastos());
    showToast(`Gasto fijo "${gastoFijo.nombre}" registrado como gasto del mes`, 'success');
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
                <span className={styles.headerIcon}>💸</span>
                <div>
                  <h1>Control de Gastos</h1>
                  <p>Registra y controla los gastos del negocio</p>
                </div>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.historialButton}
                onClick={() => setMostrarHistorial(true)}
              >
                <span>📋</span> Historial
              </button>
              <button 
                className={styles.nuevoButton}
                onClick={() => setMostrarFormulario(true)}
              >
                + Nuevo Gasto
              </button>
            </div>
          </div>
        </header>

        {/* Estadísticas */}
        <section className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              💸
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{formatearMoneda(totalHoy)}</span>
              <span className={styles.statLabel}>Gastos Hoy</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
              📊
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{formatearMoneda(totalGastos)}</span>
              <span className={styles.statLabel}>Total Filtrado</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              📝
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{gastosFiltrados.length}</span>
              <span className={styles.statLabel}>Registros</span>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className={styles.filtrosSection}>
          <div className={styles.filtroGroup}>
            <label>Periodo:</label>
            <select 
              value={filtroPeriodo} 
              onChange={(e) => setFiltroPeriodo(e.target.value)}
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Última Semana</option>
              <option value="mes">Este Mes</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label>Categoría:</label>
            <select 
              value={filtroCategoria} 
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todos">Todas</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.nombre}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Layout con Gastos Fijos al lateral */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        
        {/* Lista de Gastos (Centro) */}
        <section className={styles.listaSection}>
          {gastosFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No hay gastos registrados en este periodo</p>
              <button onClick={() => setMostrarFormulario(true)}>
                Registrar primer gasto
              </button>
            </div>
          ) : (
            <div className={styles.gastosList}>
              {gastosFiltrados.slice().reverse().map((gasto) => {
                const catInfo = getCategoriaInfo(gasto.categoria);
                return (
                  <div key={gasto.id} className={styles.gastoItem} onClick={() => setGastoSeleccionado(gasto)} style={{ cursor: 'pointer' }}>
                    <div 
                      className={styles.gastoIcon}
                      style={{ background: `${catInfo.color}20`, color: catInfo.color }}
                    >
                      {catInfo.icon}
                    </div>
                    <div className={styles.gastoInfo}>
                      <span className={styles.gastoDescripcion}>{gasto.descripcion}</span>
                      <span className={styles.gastoMeta}>
                        {catInfo.nombre} • {formatearFecha(gasto.fecha)}
                      </span>
                    </div>
                    <div className={styles.gastoActions}>
                      <span className={styles.gastoMonto}>{formatearMoneda(gasto.monto)}</span>
                      <button 
                        className={styles.btnEliminar}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontWeight: '600', border: '1px solid #fca5a5', fontSize: '0.85rem' }}
                        onClick={(e) => { e.stopPropagation(); iniciarEliminacion(gasto); }}
                        title="Eliminar"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 🆕 Panel Lateral: Gastos Fijos */}
        <aside style={{
          background: 'white', borderRadius: '12px', padding: '16px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'sticky', top: '80px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>📌 Gastos Fijos</h3>
            <button
              onClick={() => setMostrarFormGastoFijo(!mostrarFormGastoFijo)}
              style={{
                background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px',
                padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600'
              }}
            >
              {mostrarFormGastoFijo ? '✕' : '+ Agregar'}
            </button>
          </div>

          {mostrarFormGastoFijo && (
            <div style={{ marginBottom: '12px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
              <input
                type="text" placeholder="Nombre (ej: Renta)"
                value={formGastoFijo.nombre}
                onChange={(e) => setFormGastoFijo({ ...formGastoFijo, nombre: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <CurrencyInput
                placeholder="Monto mensual"
                value={formGastoFijo.monto}
                onChange={(val) => setFormGastoFijo({ ...formGastoFijo, monto: val })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <select
                value={formGastoFijo.categoria}
                onChange={(e) => setFormGastoFijo({ ...formGastoFijo, categoria: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '0.85rem', boxSizing: 'border-box' }}
              >
                {categorias.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>)}
              </select>
              <button
                onClick={agregarGastoFijo}
                style={{
                  width: '100%', padding: '8px', background: '#10b981', color: 'white',
                  border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                ✅ Guardar Gasto Fijo
              </button>
            </div>
          )}

          {gastosFijos.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '0.85rem', padding: '20px 0' }}>Sin gastos fijos configurados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gastosFijos.map(gf => {
                const catInfo = getCategoriaInfo(gf.categoria);
                return (
                  <div key={gf.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: '#f9fafb', borderRadius: '8px',
                    borderLeft: `3px solid ${catInfo.color}`
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1f2937' }}>{catInfo.icon} {gf.nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '700' }}>{formatearMoneda(gf.monto)}/mes</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => renovarGastoFijo(gf)}
                        title="Registrar este mes"
                        style={{
                          background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
                          padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600'
                        }}
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => eliminarGastoFijo(gf.id)}
                        title="Quitar"
                        style={{
                          background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px',
                          padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '4px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total fijos: </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f2937' }}>
                  {formatearMoneda(gastosFijos.reduce((s, g) => s + g.monto, 0))}/mes
                </span>
              </div>
            </div>
          )}
        </aside>

        </div> {/* Fin grid layout */}

        {/* Modal Nuevo Gasto */}
        {mostrarFormulario && (
          <div className={styles.modalOverlay} onClick={() => setMostrarFormulario(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>💸 Nuevo Gasto</h2>
                <button className={styles.closeButton} onClick={() => setMostrarFormulario(false)}>
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Descripción *</label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Ej: Pago de luz"
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Categoría</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    >
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Monto *</label>
                    <CurrencyInput
                      value={formData.monto}
                      onChange={(val) => setFormData({...formData, monto: val})}
                      placeholder="0.00"
                    />
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
                        className={`${styles.metodoPagoBtn} ${formData.metodoPago === metodo.id ? styles.active : ''}`}
                        onClick={() => setFormData({...formData, metodoPago: metodo.id})}
                      >
                        {metodo.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Notas (opcional)</label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({...formData, notas: e.target.value})}
                    placeholder="Detalles adicionales..."
                    rows={2}
                  />
                </div>

                {/* 🆕 Campo de Comprobante/Foto */}
                <div className={styles.formGroup}>
                  <label>📎 Comprobante (opcional)</label>
                  <ImageDropzone
                    onImageSave={handleImagenChange}
                    previewUrl={formData.imagenComprobante}
                    onRemove={eliminarImagen}
                  />
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className={styles.btnCancelar}
                    onClick={() => setMostrarFormulario(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className={styles.btnGuardar}
                    disabled={subiendoImagen}
                    style={{ opacity: subiendoImagen ? 0.7 : 1 }}
                  >
                    {subiendoImagen ? '⏳ Subiendo...' : '💾 Registrar Gasto'}
                  </button>
                </div>
              </form>
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
                    <h3>¿Estás seguro de eliminar este gasto?</h3>
                    <p>Esta acción no se puede deshacer.</p>
                    {gastoAEliminar && (
                      <div className={styles.gastoResumen}>
                        <span><strong>{gastoAEliminar.descripcion}</strong></span>
                        <span>{formatearMoneda(gastoAEliminar.monto)}</span>
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
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalle de Gasto */}
        {gastoSeleccionado && (
          <div className={styles.modalOverlay} onClick={() => setGastoSeleccionado(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>📋 Detalle del Gasto</h2>
                <button className={styles.closeButton} onClick={() => setGastoSeleccionado(null)}>
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.detalleGasto}>
                  <div className={styles.detalleRow}>
                    <span className={styles.detalleLabel}>Descripción:</span>
                    <span className={styles.detalleValue}>{gastoSeleccionado.descripcion}</span>
                  </div>
                  <div className={styles.detalleRow}>
                    <span className={styles.detalleLabel}>Categoría:</span>
                    <span className={styles.detalleValue}>
                      {getCategoriaInfo(gastoSeleccionado.categoria).icon} {getCategoriaInfo(gastoSeleccionado.categoria).nombre}
                    </span>
                  </div>
                  <div className={styles.detalleRow}>
                    <span className={styles.detalleLabel}>Monto:</span>
                    <span className={`${styles.detalleValue} ${styles.montoGrande}`}>{formatearMoneda(gastoSeleccionado.monto)}</span>
                  </div>
                  <div className={styles.detalleRow}>
                    <span className={styles.detalleLabel}>Método de Pago:</span>
                    <span className={styles.detalleValue}>{gastoSeleccionado.metodoPago || 'Efectivo'}</span>
                  </div>
                  <div className={styles.detalleRow}>
                    <span className={styles.detalleLabel}>Fecha:</span>
                    <span className={styles.detalleValue}>{formatearFecha(gastoSeleccionado.fecha)}</span>
                  </div>
                  {gastoSeleccionado.notas && (
                    <div className={styles.detalleRow}>
                      <span className={styles.detalleLabel}>Notas:</span>
                      <span className={styles.detalleValue}>{gastoSeleccionado.notas}</span>
                    </div>
                  )}
                  {gastoSeleccionado.imagenComprobante && (
                    <div className={styles.detalleRow}>
                      <span className={styles.detalleLabel}>Comprobante:</span>
                      <div className={styles.comprobantePreview}>
                        <img 
                          src={gastoSeleccionado.imagenComprobante} 
                          alt="Comprobante" 
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer' }}
                          onClick={() => setImagenAmpliada(gastoSeleccionado.imagenComprobante)}
                        />
                        <span className={styles.clickToEnlarge}>Toca para ampliar</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.detalleActions}>
                  <button 
                    className={styles.btnEliminarGasto}
                    onClick={() => {
                      setGastoSeleccionado(null);
                      iniciarEliminacion(gastoSeleccionado);
                    }}
                  >
                    🗑️ Eliminar Gasto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Historial de Gastos */}
        {mostrarHistorial && (
          <div className={styles.modalOverlay} onClick={() => setMostrarHistorial(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>📋 Historial de Gastos</h2>
                <button className={styles.closeButton} onClick={() => setMostrarHistorial(false)}>
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                {gastos.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span>📭</span>
                    <p>No hay gastos registrados</p>
                  </div>
                ) : (
                  <div className={styles.historialList}>
                    {gastos.slice().reverse().map((gasto) => {
                      const catInfo = getCategoriaInfo(gasto.categoria);
                      return (
                        <div key={gasto.id} className={styles.historialItem}>
                          <div className={styles.historialHeader}>
                            <span 
                              className={styles.historialIcon}
                              style={{ background: `${catInfo.color}20`, color: catInfo.color }}
                            >
                              {catInfo.icon}
                            </span>
                            <span className={styles.historialFecha}>{formatearFecha(gasto.fecha)}</span>
                          </div>
                          <div className={styles.historialBody}>
                            <span className={styles.historialDescripcion}>{gasto.descripcion}</span>
                            <span className={styles.historialCategoria}>{catInfo.nombre}</span>
                          </div>
                          <div className={styles.historialFooter}>
                            <span className={`${styles.metodoBadge} ${styles[gasto.metodoPago]}`}>
                              {gasto.metodoPago === 'efectivo' ? '💵 Efectivo' : 
                               gasto.metodoPago === 'transferencia' ? '🏦 Transferencia' : '💳 Tarjeta'}
                            </span>
                            <div className={styles.historialActions}>
                              <span className={styles.historialMonto}>{formatearMoneda(gasto.monto)}</span>
                              <button 
                                className={styles.btnEliminarHistorial}
                                style={{ 
                                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #fca5a5', 
                                  background: '#fef2f2', color: '#dc2626', fontWeight: '600', 
                                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  iniciarEliminacion(gasto);
                                }}
                                title="Eliminar gasto"
                              >
                                <span>🗑️</span> Eliminar Gasto
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Modal para imagen ampliada */}
      {imagenAmpliada && (
        <ImageModal 
          imageUrl={imagenAmpliada} 
          onClose={() => setImagenAmpliada(null)} 
        />
      )}
    </>
  );
}
