'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './gastos.module.css';
import { getGastos, addGasto, deleteGasto } from '@/lib/storage';

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

  const categorias = [
    { id: 'operacion', nombre: 'Operación', icon: '⚙️', color: '#6366f1' },
    { id: 'servicios', nombre: 'Servicios', icon: '💡', color: '#f59e0b' },
    { id: 'compras', nombre: 'Compras/Mercancía', icon: '📦', color: '#10b981' },
    { id: 'nomina', nombre: 'Nómina', icon: '👥', color: '#8b5cf6' },
    { id: 'transporte', nombre: 'Transporte', icon: '🚚', color: '#ec4899' },
    { id: 'mantenimiento', nombre: 'Mantenimiento', icon: '🔧', color: '#14b8a6' },
    { id: 'otros', nombre: 'Otros', icon: '📋', color: '#64748b' },
  ];

  useEffect(() => {
    setGastos(getGastos());
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.descripcion || !formData.monto) {
      showToast('Completa los campos requeridos', 'warning');
      return;
    }

    const nuevoGasto = addGasto({
      ...formData,
      monto: parseFloat(formData.monto)
    });

    setGastos(getGastos());
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

  // Funciones para manejar imagen de comprobante
  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      procesarImagen(file);
    }
  };

  const procesarImagen = (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB máximo
      showToast('La imagen es muy grande (máx 5MB)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData({ ...formData, imagenComprobante: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      procesarImagen(file);
    }
  };

  const eliminarImagen = () => {
    setFormData({ ...formData, imagenComprobante: null });
  };

  // Funciones de eliminación
  const iniciarEliminacion = (gasto) => {
    setGastoAEliminar(gasto);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && gastoAEliminar) {
      deleteGasto(gastoAEliminar.id);
      setGastos(getGastos());
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
            <button 
              className={styles.nuevoButton}
              onClick={() => setMostrarFormulario(true)}
            >
              + Nuevo Gasto
            </button>
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

        {/* Lista de Gastos */}
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
                  <div key={gasto.id} className={styles.gastoItem}>
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
                        onClick={() => iniciarEliminacion(gasto)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
                    <input
                      type="number"
                      value={formData.monto}
                      onChange={(e) => setFormData({...formData, monto: e.target.value})}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
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
                  {formData.imagenComprobante ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={formData.imagenComprobante} 
                        alt="Comprobante" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '150px', 
                          borderRadius: '8px',
                          border: '2px solid #ddd'
                        }} 
                      />
                      <button
                        type="button"
                        onClick={eliminarImagen}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${arrastrando ? '#6366f1' : '#ddd'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center',
                        background: arrastrando ? 'rgba(99, 102, 241, 0.1)' : '#f9fafb',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => document.getElementById('inputComprobante').click()}
                    >
                      <input
                        type="file"
                        id="inputComprobante"
                        accept="image/*"
                        onChange={handleImagenChange}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📷</span>
                      <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                        Arrastra una imagen aquí o <strong>haz clic</strong> para seleccionar
                      </p>
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    className={styles.btnCancelar}
                    onClick={() => setMostrarFormulario(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className={styles.btnGuardar}>
                    💾 Registrar Gasto
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
      </main>
    </>
  );
}
