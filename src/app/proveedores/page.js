'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './proveedores.module.css';
import { getProveedores, addProveedor, updateProveedor, saveProveedores, getCompras, addCompra, getProductos, updateProducto, actualizarStock } from '@/lib/storage';
import CurrencyInput from '@/components/CurrencyInput';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]); // Historial general
  const [productos, setProductos] = useState([]); // Productos para el select
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Estado para Modal de Compra
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [compraFormData, setCompraFormData] = useState({
    productoId: '',
    cantidad: 1,
    precioCompra: '',
    precioVenta: '',
    adjuntoURL: null, // 🆕 Adjunto de comprobante
  });

  const [guardando, setGuardando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  
  // Estados para eliminación segura
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    productos: [],
    notas: '',
    ofreceCredito: false,
    diasCredito: 0,
    limiteCredito: '',
    imagenURL: null,
    otroProducto: '',
    mostrarInputOtro: false,
  });

  // Cargar proveedores y compras al montar el componente
  useEffect(() => {
    setProveedores(getProveedores());
    setCompras(getCompras());
  }, []);

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(proveedor => {
    const coincideBusqueda = 
      proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.contacto.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.telefono.includes(busqueda) ||
      (proveedor.productos && proveedor.productos.some(p => p.toLowerCase().includes(busqueda.toLowerCase())));
    const coincideEstado = filtroEstado === 'todos' || proveedor.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  // Estadísticas
  const totalProveedores = proveedores.length;
  const proveedoresActivos = proveedores.filter(p => p.estado === 'activo').length;
  const categoriasProvistas = [...new Set(proveedores.flatMap(p => p.productos || []))].length;

  const getCategoriaIcon = (categoria) => {
    const iconos = {
      'Res': '🥩',
      'Cerdo': '🐷',
      'Pollo': '🍗',
      'Embutidos': '🌭',
    };
    return iconos[categoria] || '📦';
  };

  const formatearFecha = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN'
    }).format(cantidad || 0);
  };

  const handleCreditChange = (value) => {
    setFormData(prev => ({
      ...prev,
      ofreceCredito: value === 'si',
      diasCredito: value === 'si' ? prev.diasCredito : 0
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductosChange = (producto) => {
    setFormData(prev => {
      const productos = prev.productos.includes(producto)
        ? prev.productos.filter(p => p !== producto)
        : [...prev.productos, producto];
      return { ...prev, productos };
    });
  };

  const procesarImagen = (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'warning');
      return;
    }
    // Límite de 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('⚠️ La imagen es grande (>10MB). Podría fallar al guardar.', 'warning');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ ...prev, imagenURL: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) procesarImagen(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#3b82f6';
    e.currentTarget.style.background = '#eff6ff';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#e5e7eb';
    e.currentTarget.style.background = '#f9fafb';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#e5e7eb';
    e.currentTarget.style.background = '#f9fafb';
    const file = e.dataTransfer.files[0];
    if (file) procesarImagen(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setGuardando(true);

    // Validar campos requeridos
    if (!formData.nombre || !formData.contacto || !formData.telefono) {
      showToast('Por favor llena todos los campos requeridos', 'warning');
      setGuardando(false);
      return;
    }

    // Procesar productos
    let productosFinales = [...formData.productos];
    if (formData.mostrarInputOtro && formData.otroProducto.trim()) {
      productosFinales.push(formData.otroProducto.trim());
    }

    try {
        const proveedorData = {
            nombre: formData.nombre,
            contacto: formData.contacto,
            telefono: formData.telefono,
            email: formData.email || '',
            direccion: formData.direccion || '',
            productos: productosFinales,
            notas: formData.notas || '',
            ofreceCredito: formData.ofreceCredito,
            diasCredito: formData.ofreceCredito ? parseInt(formData.diasCredito) || 0 : 0,
            limiteCredito: formData.ofreceCredito ? parseFloat(formData.limiteCredito) || 0 : 0,
            imagenURL: formData.imagenURL,
        };

        if (modoEdicion && proveedorEditando) {
            updateProveedor(proveedorEditando.id, proveedorData);
            showToast(`Proveedor "${formData.nombre}" actualizado exitosamente`, 'success');
        } else {
            const nuevoProveedor = addProveedor(proveedorData);
            showToast(`Proveedor "${nuevoProveedor.nombre}" guardado exitosamente`, 'success');
        }

        // Actualizar lista
        setProveedores(getProveedores());

        // Limpiar formulario y cerrar modal
        resetForm();
        setMostrarFormulario(false);
    } catch (error) {
        console.error('Error al guardar proveedor:', error);
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            alert('⚠️ Error: No hay suficiente espacio para guardar la imagen. Intenta usar una imagen más pequeña o elimina datos antiguos.');
        } else {
            alert('Ocurrió un error al guardar el proveedor: ' + error.message);
        }
    } finally {
        setGuardando(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      productos: [],
      notas: '',
      ofreceCredito: false,
      diasCredito: 0,
      limiteCredito: '',
      imagenURL: null,
      otroProducto: '',
      mostrarInputOtro: false,
    });
    setModoEdicion(false);
    setProveedorEditando(null);
  };

  const iniciarEdicion = (proveedor) => {
    setFormData({
      nombre: proveedor.nombre || '',
      contacto: proveedor.contacto || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      productos: proveedor.productos || [],
      notas: proveedor.notas || '',
      ofreceCredito: proveedor.ofreceCredito || false,
      diasCredito: proveedor.diasCredito || 0,
      limiteCredito: proveedor.limiteCredito || '',
      imagenURL: proveedor.imagenURL || null,
      otroProducto: '',
      mostrarInputOtro: false,
    });
    setProveedorEditando(proveedor);
    setModoEdicion(true);
    setMostrarDetalle(false); // Close detail modal if open
    setMostrarFormulario(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const iniciarEliminacion = (proveedor) => {
    setProveedorAEliminar(proveedor);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && proveedorAEliminar) {
      const proveedoresActualizados = proveedores.filter(p => p.id !== proveedorAEliminar.id);
      saveProveedores(proveedoresActualizados);
      setProveedores(proveedoresActualizados);
      setMostrarModalEliminar(false);
      setMostrarDetalle(false);
      setProveedorAEliminar(null);
      setConfirmarTexto('');
      showToast(`Proveedor "${proveedorAEliminar.nombre}" eliminado`, 'success');
    }
  };

  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setProveedorAEliminar(null);
    setConfirmarTexto('');
  };

  const verDetalle = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setMostrarDetalle(true);
  };

  const cambiarEstado = (proveedor) => {
    const nuevoEstado = proveedor.estado === 'activo' ? 'inactivo' : 'activo';
    const proveedoresActualizados = proveedores.map(p => 
      p.id === proveedor.id ? { ...p, estado: nuevoEstado } : p
    );
    saveProveedores(proveedoresActualizados);
    setProveedores(proveedoresActualizados);
    if (proveedorSeleccionado && proveedorSeleccionado.id === proveedor.id) {
      setProveedorSeleccionado({ ...proveedorSeleccionado, estado: nuevoEstado });
    }
  };

  // --- Lógica de Compra ---
  const abrirModalCompra = () => {
    // Cargar productos y filtrar los que provee este proveedor (si tiene lista definida, opcional)
    // Por ahora cargamos todos para flexibilidad
    const allProducts = getProductos();
    setProductos(allProducts);
    
    setCompraFormData({
      productoId: '',
      cantidad: 1,
      precioCompra: '',
      precioVenta: ''
    });
    setMostrarModalCompra(true);
  };

  const handleCompraInputChange = (e) => {
    const { name, value } = e.target;
    setCompraFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si cambia el producto, pre-llenar precios
    if (name === 'productoId') {
      const prod = productos.find(p => p.id === parseInt(value));
      if (prod) {
        setCompraFormData(prev => ({
          ...prev,
          productoId: value,
          precioCompra: prod.precioCompra || '',
          precioVenta: prod.precioVenta || ''
        }));
      }
    }
  };

  const handleRegistrarCompra = (e) => {
    e.preventDefault();
    setGuardando(true);
    
    try {
      const { productoId, cantidad, precioCompra, precioVenta } = compraFormData;
      
      if (!productoId || !cantidad || !precioCompra || !precioVenta) {
        setToast({ show: true, message: 'Todos los campos son obligatorios', type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        setGuardando(false);
        return;
      }

      const prod = productos.find(p => p.id === parseInt(productoId));
      
      // 1. Registrar Compra (genera gasto automático ahora)
      addCompra({
        productoId: parseInt(productoId),
        productoNombre: prod ? prod.nombre : 'Desconocido',
        proveedorId: proveedorSeleccionado.id,
        proveedorNombre: proveedorSeleccionado.nombre,
        cantidad: parseFloat(cantidad),
        unidad: prod ? prod.unidad : 'Unit',
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta),
        adjuntoURL: compraFormData.adjuntoURL, // 🆕 Comprobante adjunto
      });

      // 2. Actualizar Producto (Stock y Precios)
      updateProducto(parseInt(productoId), {
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta)
      });
      actualizarStock(parseInt(productoId), parseFloat(cantidad), 'agregar');

      // 3. UI Feedback
      setToast({ show: true, message: 'Compra registrada y gasto generado correctamente', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      
      // Actualizar historial localmente
      setCompras(getCompras());
      setMostrarModalCompra(false);
      
    } catch (error) {
      console.error('Error registrando compra:', error);
      setToast({ show: true, message: error.message || 'Error al registrar compra', type: 'error' });
    } finally {
      setGuardando(false);
    }
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
              <span className={styles.headerIcon}>🏭</span>
              <div>
                <h1>Proveedores</h1>
                <p>Gestión de proveedores</p>
              </div>
            </div>
          </div>
          <button
            className={styles.addButton}
            onClick={() => setMostrarFormulario(true)}
          >
            <span>➕</span> Nuevo Proveedor
          </button>
        </div>
      </header>

      {/* Estadísticas */}
      <section className={styles.statsSection}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>🏭</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{totalProveedores}</span>
            <span className={styles.statLabel}>Total Proveedores</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>✅</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{proveedoresActivos}</span>
            <span className={styles.statLabel}>Activos</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>📦</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{categoriasProvistas}</span>
            <span className={styles.statLabel}>Categorías</span>
          </div>
        </div>
      </section>

      {/* 🆕 Últimos Movimientos */}
      {compras.length > 0 && (
        <section style={{ marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚚</span> Últimos Movimientos
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left', color: '#6b7280' }}>
                  <th style={{ padding: '10px' }}>Fecha</th>
                  <th style={{ padding: '10px' }}>Proveedor</th>
                  <th style={{ padding: '10px' }}>Producto</th>
                  <th style={{ padding: '10px' }}>Cantidad</th>
                  <th style={{ padding: '10px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {compras
                  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                  .slice(0, 5)
                  .map(compra => (
                    <tr key={compra.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', color: '#6b7280' }}>{formatearFecha(compra.fecha)}</td>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#374151' }}>{compra.proveedorNombre}</td>
                      <td style={{ padding: '10px' }}>{compra.productoNombre}</td>
                      <td style={{ padding: '10px' }}>{compra.cantidad} {compra.unidad}</td>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#059669' }}>
                        {formatearMoneda(compra.precioCompra * compra.cantidad)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Filtros */}
      <section className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, contacto, teléfono o producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">✅ Activos</option>
          <option value="inactivo">⚪ Inactivos</option>
        </select>
      </section>

      {/* Grid de Proveedores */}
      <section className={styles.proveedoresGrid}>
        {proveedoresFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            {proveedores.length === 0 
              ? '📭 No hay proveedores registrados. ¡Agrega el primero!' 
              : '🔍 No se encontraron proveedores con esos filtros'}
          </div>
        ) : (
          proveedoresFiltrados.map((proveedor) => (
            <div key={proveedor.id} className={styles.proveedorCard}>
              <div className={styles.cardHeader}>
                <div className={styles.proveedorAvatar}>
                  {proveedor.imagenURL ? (
                    <img src={proveedor.imagenURL} alt={proveedor.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    proveedor.nombre.charAt(0)
                  )}
                </div>
                <div className={styles.proveedorInfo}>
                  <h3>{proveedor.nombre}</h3>
                  <p>👤 {proveedor.contacto}</p>
                </div>
                <span className={`${styles.estadoBadge} ${styles[proveedor.estado]}`}>
                  {proveedor.estado === 'activo' ? '🟢 Activo' : '⚪ Inactivo'}
                </span>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.contactoItem}>
                  <span>📞</span>
                  <span>{proveedor.telefono}</span>
                </div>
                {proveedor.email && (
                  <div className={styles.contactoItem}>
                    <span>✉️</span>
                    <span>{proveedor.email}</span>
                  </div>
                )}
                {proveedor.direccion && (
                  <div className={styles.contactoItem}>
                    <span>📍</span>
                    <span>{proveedor.direccion}</span>
                  </div>
                )}
              </div>

              {proveedor.productos && proveedor.productos.length > 0 && (
                <div className={styles.productosSection}>
                  <span className={styles.productosLabel}>Productos:</span>
                  <div className={styles.productosTags}>
                    {proveedor.productos.map((producto, idx) => (
                      <span key={idx} className={styles.productoTag}>
                        {getCategoriaIcon(producto)} {producto}
                      </span>
                    ))}
                  </div>
                </div>
              )}


              <div className={styles.creditInfo} style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                {proveedor.ofreceCredito ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#059669', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      💳 Crédito: <strong>{proveedor.diasCredito} días</strong>
                    </span>
                    {proveedor.limiteCredito && proveedor.limiteCredito > 0 && (
                      <span style={{ color: '#059669', fontSize: '0.8rem', marginLeft: '22px' }}>
                        Límite: ${proveedor.limiteCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#6b7280', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    💵 Solo Contado
                  </span>
                )}
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={styles.btnAction}
                  onClick={() => verDetalle(proveedor)}
                  title="Ver detalle"
                >
                  📋
                </button>
                <button 
                  className={styles.btnAction}
                  onClick={() => cambiarEstado(proveedor)}
                  title={proveedor.estado === 'activo' ? 'Desactivar' : 'Activar'}
                >
                  {proveedor.estado === 'activo' ? '⏸️' : '▶️'}
                </button>
                <button 
                  className={styles.btnAction}
                  onClick={() => iniciarEdicion(proveedor)}
                  title="Editar"
                >
                  ✏️
                </button>
                <button 
                  className={styles.btnAction}
                  onClick={() => iniciarEliminacion(proveedor)}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modal Detalle Proveedor */}
      {mostrarDetalle && proveedorSeleccionado && (
        <div className={styles.modalOverlay} onClick={() => setMostrarDetalle(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>🏭 Detalle del Proveedor</h2>
              <button className={styles.closeButton} onClick={() => setMostrarDetalle(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleHeader}>
                <div className={styles.avatarLarge}>
                  {proveedorSeleccionado.imagenURL ? (
                    <img src={proveedorSeleccionado.imagenURL} alt={proveedorSeleccionado.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    proveedorSeleccionado.nombre.charAt(0)
                  )}
                </div>
                <div>
                  <h3>{proveedorSeleccionado.nombre}</h3>
                  <span className={`${styles.estadoBadge} ${styles[proveedorSeleccionado.estado]}`}>
                    {proveedorSeleccionado.estado === 'activo' ? '🟢 Activo' : '⚪ Inactivo'}
                  </span>
                </div>
              </div>

              <div className={styles.detalleSections}>
                <div className={styles.detalleSection}>
                  <h4>👤 Información de Contacto</h4>
                  <div className={styles.infoGrid}>
                    <div>
                      <label>Persona de Contacto</label>
                      <p>{proveedorSeleccionado.contacto}</p>
                    </div>
                    <div>
                      <label>Teléfono</label>
                      <p>{proveedorSeleccionado.telefono}</p>
                    </div>
                    <div>
                      <label>Email</label>
                      <p>{proveedorSeleccionado.email || 'No registrado'}</p>
                    </div>
                    <div>
                      <label>Dirección</label>
                      <p>{proveedorSeleccionado.direccion || 'No registrada'}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.detalleSection}>
                  <h4>📦 Productos que Provee</h4>
                  {proveedorSeleccionado.productos && proveedorSeleccionado.productos.length > 0 ? (
                    <div className={styles.productosTags}>
                      {proveedorSeleccionado.productos.map((producto, idx) => (
                        <span key={idx} className={styles.productoTagLarge}>
                          {getCategoriaIcon(producto)} {producto}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#666' }}>No hay productos registrados</p>
                  )}
                </div>

                {proveedorSeleccionado.notas && (
                  <div className={styles.detalleSection}>
                    <h4>📝 Notas</h4>
                    <p>{proveedorSeleccionado.notas}</p>
                  </div>
                )}

                {/* Historial de Compras */}
                <div className={styles.detalleSection}>
                  <h4>📜 Historial de Compras</h4>
                  {compras.filter(c => c.proveedorId === proveedorSeleccionado.id).length > 0 ? (
                    <div className={styles.tableContainer}>
                      <table className={styles.historyTable}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Cant.</th>
                            <th>Costo</th>
                            <th>Venta</th>
                            <th>Ganancia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compras
                            .filter(c => c.proveedorId === proveedorSeleccionado.id)
                            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                            .map((compra) => (
                              <tr key={compra.id}>
                                <td>{formatearFecha(compra.fecha)}</td>
                                <td>{compra.productoNombre}</td>
                                <td>{compra.cantidad} {compra.unidad}</td>
                                <td>{formatearMoneda(compra.precioCompra)}</td>
                                <td style={{ color: '#666' }}>{formatearMoneda(compra.precioVenta)}</td>
                                <td>
                                  <span className={styles.margenBadge}>
                                    {Number(compra.margen).toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No hay compras registradas para este proveedor.</p>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnDanger}
                onClick={() => iniciarEliminacion(proveedorSeleccionado)}
              >
                🗑️ Eliminar
              </button>
              <button 
                className={styles.btnSecondary}
                onClick={() => cambiarEstado(proveedorSeleccionado)}
              >
                {proveedorSeleccionado.estado === 'activo' ? '⏸️ Desactivar' : '▶️ Activar'}
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={() => iniciarEdicion(proveedorSeleccionado)}
                style={{ marginLeft: '10px' }}
              >
                ✏️ Editar
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={abrirModalCompra}
                style={{ marginLeft: '10px', background: '#10b981' }}
              >
                🛒 Registrar Compra
              </button>
              <button className={styles.btnPrimary} onClick={() => setMostrarDetalle(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Proveedor */}
      {mostrarFormulario && (
        <div className={styles.modalOverlay} onClick={() => { setMostrarFormulario(false); resetForm(); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modoEdicion ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}</h2>
              <button className={styles.closeButton} onClick={() => { setMostrarFormulario(false); resetForm(); }}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formSection}>
                  <h4>🏭 Información del Proveedor</h4>
                  
                  <div style={{ marginBottom: '20px' }}>
                    {formData.imagenURL ? (
                      <div style={{ position: 'relative', width: '100%', textAlign: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                         <img 
                           src={formData.imagenURL} 
                           alt="Vista previa" 
                           style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                         />
                         <button 
                           type="button"
                           onClick={() => setFormData(prev => ({ ...prev, imagenURL: null }))}
                           style={{ 
                             position: 'absolute', top: '5px', right: '5px', 
                             background: '#fee2e2', color: '#b91c1c', border: 'none', 
                             borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' 
                           }}
                         >
                           ✕
                         </button>
                      </div>
                    ) : (
                      <label 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{ 
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                          padding: '20px', border: '2px dashed #e5e7eb', borderRadius: '8px',
                          cursor: 'pointer', background: '#f9fafb', transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>📸</span>
                        <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Agregar logo o foto</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Nombre de la Empresa *</label>
                      <input 
                        type="text" 
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        placeholder="Ej: Carnes del Bajío S.A." 
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Persona de Contacto *</label>
                      <input 
                        type="text" 
                        name="contacto"
                        value={formData.contacto}
                        onChange={handleInputChange}
                        placeholder="Ej: Pedro Sánchez" 
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Teléfono *</label>
                      <input 
                        type="tel" 
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleInputChange}
                        placeholder="Ej: 462-555-0001" 
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Ej: ventas@proveedor.com" 
                      />
                    </div>
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label>Dirección</label>
                      <input 
                        type="text" 
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        placeholder="Ej: Zona Industrial, Irapuato" 
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h4>📦 Productos que Provee</h4>
                  <div className={styles.checkboxGroup}>
                    {['Res', 'Cerdo', 'Pollo', 'Embutidos'].map((producto) => (
                      <label key={producto} className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          checked={formData.productos.includes(producto)}
                          onChange={() => handleProductosChange(producto)}
                        />
                        <span className={styles.checkboxCustom}></span>
                        {getCategoriaIcon(producto)} {producto}
                      </label>
                    ))}
                    
                    {/* Opción Otros */}
                    <div className={styles.otrosContainer} style={{ width: '100%', marginTop: '8px' }}>
                      <label className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          checked={formData.mostrarInputOtro}
                          onChange={(e) => setFormData(prev => ({ ...prev, mostrarInputOtro: e.target.checked }))}
                        />
                        <span className={styles.checkboxCustom}></span>
                        ✨ Otros
                      </label>
                      
                      {formData.mostrarInputOtro && (
                        <div style={{ paddingLeft: '28px', marginTop: '8px' }}>
                          <input 
                            type="text"
                            name="otroProducto"
                            value={formData.otroProducto}
                            onChange={handleInputChange}
                            placeholder="Especifica el producto..." 
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h4>💰 Información de Crédito</h4>
                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel} style={{ marginBottom: '15px' }}>
                      <input 
                        type="checkbox"
                        checked={formData.ofreceCredito}
                        onChange={(e) => setFormData(prev => ({
                          ...prev, 
                          ofreceCredito: e.target.checked,
                          diasCredito: e.target.checked ? prev.diasCredito || 30 : 0, // Default 30 days if checked
                          limiteCredito: e.target.checked ? prev.limiteCredito : ''
                        }))}
                      />
                      <span className={styles.checkboxCustom}></span>
                      ¿Este proveedor ofrece crédito?
                    </label>
                  </div>

                  {formData.ofreceCredito && (
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label>Días de Crédito</label>
                        <input 
                          type="number" 
                          name="diasCredito"
                          value={formData.diasCredito}
                          onChange={handleInputChange}
                          placeholder="Ej: 30" 
                          min="0"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Límite de Crédito (Opcional)</label>
                        <CurrencyInput 
                          name="limiteCredito"
                          value={formData.limiteCredito}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formSection}>
                  <h4>📝 Notas (Opcional)</h4>
                  <div className={styles.formGroup}>
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleInputChange}
                      placeholder="Horarios de entrega, condiciones de pago, etc..."
                      rows="3"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnSecondary} 
                onClick={() => {
                  setMostrarFormulario(false);
                  resetForm();
                }}
                type="button"
              >
                Cancelar
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={guardando}
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar Proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {mostrarModalEliminar && proveedorAEliminar && (
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
                <p><strong>¿Estás seguro de eliminar este proveedor?</strong></p>
                <p className={styles.advertenciaTexto}>
                  Esta acción eliminará permanentemente:<br/>
                  • Proveedor: <strong>{proveedorAEliminar.nombre}</strong><br/>
                  • Contacto: {proveedorAEliminar.contacto}<br/>
                  • Teléfono: {proveedorAEliminar.telefono}
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
      {/* Modal Registrar Compra */}
      {mostrarModalCompra && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalCompra(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <h2>🛒 Registrar Compra</h2>
              <button className={styles.closeButton} onClick={() => setMostrarModalCompra(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ marginBottom: '20px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', fontSize: '0.9rem' }}>
                <p><strong>Nota:</strong> Al registrar esta compra, se actualizará el stock del producto y se generará automáticamente un <strong>Gasto</strong> en finanzas.</p>
              </div>

              <form className={styles.form} onSubmit={handleRegistrarCompra}>
                <div className={styles.formGroup}>
                  <label>Proveedor</label>
                  <input type="text" value={proveedorSeleccionado?.nombre} disabled style={{ background: '#f3f4f6' }} />
                </div>

                <div className={styles.formGroup}>
                  <label>Producto *</label>
                  <select 
                    name="productoId" 
                    value={compraFormData.productoId} 
                    onChange={handleCompraInputChange}
                    required
                  >
                    <option value="">-- Selecciona un producto --</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock} {p.unidad})</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Cantidad *</label>
                    <input 
                      type="number" 
                      name="cantidad"
                      value={compraFormData.cantidad}
                      onChange={handleCompraInputChange}
                      min="0.1"
                      step="any"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Costo Unitario ($) *</label>
                    <CurrencyInput 
                      name="precioCompra"
                      value={compraFormData.precioCompra}
                      onChange={handleCompraInputChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Nuevo Precio Venta ($) *</label>
                  <CurrencyInput 
                    name="precioVenta"
                    value={compraFormData.precioVenta}
                    onChange={handleCompraInputChange}
                    placeholder="0.00"
                  />
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                    Se actualizará el precio público de este producto.
                  </p>
                </div>

                {/* 🆕 Adjuntar Comprobante */}
                <div className={styles.formGroup}>
                  <label>📎 Adjuntar Comprobante (Foto/Factura)</label>
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    alignItems: 'center',
                    marginTop: '8px' 
                  }}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setToast({ show: true, message: '⚠️ Archivo muy grande (máx 5MB)', type: 'warning' });
                            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => setCompraFormData(prev => ({ ...prev, adjuntoURL: ev.target.result }));
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    {compraFormData.adjuntoURL && (
                      <button 
                        type="button"
                        onClick={() => setCompraFormData(prev => ({ ...prev, adjuntoURL: null }))}
                        style={{ 
                          background: '#fee2e2', 
                          color: '#dc2626', 
                          border: 'none', 
                          padding: '6px 12px', 
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Quitar
                      </button>
                    )}
                  </div>
                  {compraFormData.adjuntoURL && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      {compraFormData.adjuntoURL.startsWith('data:image') ? (
                        <img 
                          src={compraFormData.adjuntoURL} 
                          alt="Vista previa" 
                          style={{ maxWidth: '150px', maxHeight: '100px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                      ) : (
                        <span style={{ color: '#059669', fontSize: '0.9rem' }}>📄 PDF adjunto</span>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnSecondary}
                onClick={() => setMostrarModalCompra(false)}
              >
                Cancelar
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleRegistrarCompra}
                disabled={guardando}
              >
                {guardando ? '⏳ Guardando...' : '💾 Registrar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
