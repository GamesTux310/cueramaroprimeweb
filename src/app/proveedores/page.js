'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './proveedores.module.css';
import { getProveedores, addProveedor, updateProveedor, saveProveedores, getCompras, addCompra, deleteCompra, getProductos, updateProducto, actualizarStock, registrarAbonoProveedor, deleteProveedorCascade } from '@/lib/storage';
import { uploadImage } from '@/lib/storageService';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import ActivityCalendar from '@/components/ActivityCalendar';
import ImageDropzone from '@/components/ImageDropzone';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]); // Historial general
  const [productos, setProductos] = useState([]); // Productos para el select
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Estado para Modal de Historial de Compras
  const [mostrarHistorialCompras, setMostrarHistorialCompras] = useState(false);
  const [compraAEliminar, setCompraAEliminar] = useState(null);
  const [mostrarModalEliminarCompra, setMostrarModalEliminarCompra] = useState(false);
  const [confirmarTextoCompra, setConfirmarTextoCompra] = useState('');

  // Estado para Modal de Compra
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [detalleCompra, setDetalleCompra] = useState(null);
  const [compraFormData, setCompraFormData] = useState({
    productoId: '',
    cantidad: '',
    precioCompra: '',
    precioVenta: '',
    tipoCompra: 'contado', // 🆕
    fechaVencimiento: '', // 🆕
    adjuntoURL: null,
  });

  // 🆕 Filtro para la lista de productos dentro del modal de Compra en Proveedores
  const [filtroCategoriaCompra, setFiltroCategoriaCompra] = useState('Todas');

  // 🆕 Estado para Modal de Abono (Pago a Proveedor)
  const [mostrarModalAbono, setMostrarModalAbono] = useState(false);
  const [abonoData, setAbonoData] = useState({
    monto: '',
    metodoPago: 'efectivo',
    nota: '',
    comprobanteURL: null,
    fecha: new Date().toISOString().split('T')[0]
  });

  const [guardando, setGuardando] = useState(false);
  const [subiendoImagenProveedor, setSubiendoImagenProveedor] = useState(false);
  const [subiendoAdjuntoCompra, setSubiendoAdjuntoCompra] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);

  // Estados para eliminación segura
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
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

  // Cargar proveedores y compras al montar el componente y escuchar cambios
  useEffect(() => {
    const cargarDatos = async () => {
      setProveedores(await getProveedores());
      setCompras(await getCompras());
    };

    cargarDatos();

    window.addEventListener('cueramaro_data_updated', cargarDatos);
    return () => window.removeEventListener('cueramaro_data_updated', cargarDatos);
  }, []);

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(proveedor => {
    const coincideBusqueda =
      (proveedor.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (proveedor.contacto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (proveedor.telefono || '').includes(busqueda) ||
      (proveedor.productos && proveedor.productos.some(p => (p || '').toLowerCase().includes(busqueda.toLowerCase())));
    const coincideEstado = filtroEstado === 'todos' || proveedor.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  // Filtrar compras del proveedor seleccionado
  const comprasProveedor = useMemo(() => {
    if (!proveedorSeleccionado) return [];
    return compras
      .filter(c => c.proveedorId === proveedorSeleccionado.id)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 20); // Últimas 20
  }, [compras, proveedorSeleccionado]);

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

  const parsearFecha = (fechaInput) => {
    if (!fechaInput) return new Date();
    if (fechaInput instanceof Date) return fechaInput;
    if (fechaInput.indexOf('T') > -1) return new Date(fechaInput);
    if (fechaInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [anio, mes, dia] = fechaInput.split('-');
      return new Date(anio, mes - 1, dia);
    }
    return new Date(fechaInput);
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

  const procesarImagen = async (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'warning');
      return;
    }
    // Límite de 10MB
    if (file.size > 20 * 1024 * 1024) {
      showToast('⚠️ La imagen es grande (>20MB). Podría fallar al guardar.', 'warning');
    }

    try {
      setSubiendoImagenProveedor(true);
      const url = await uploadImage(file, 'proveedores');
      setFormData(prev => ({ ...prev, imagenURL: url }));
      showToast('Imagen subida correctamente', 'success');
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      showToast('Error al subir la imagen. Intenta de nuevo.', 'error');
    } finally {
      setSubiendoImagenProveedor(false);
    }
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

  const handleRegistrarAbono = async (e) => {
    e.preventDefault();
    if (!abonoData.monto || parseFloat(abonoData.monto) <= 0) {
      showToast('Ingresa un monto válido', 'warning');
      return;
    }

    try {
      await registrarAbonoProveedor({
        proveedorId: proveedorSeleccionado.id,
        monto: parseFloat(abonoData.monto),
        metodoPago: abonoData.metodoPago,
        nota: abonoData.nota,
        comprobanteURL: abonoData.comprobanteURL,
        fecha: abonoData.fecha
      });

      showToast('Pago registrado correctamente', 'success');
      setMostrarModalAbono(false);
      setAbonoData({ monto: '', metodoPago: 'efectivo', nota: '', comprobanteURL: null, fecha: new Date().toISOString().split('T')[0] });

      // Recargar datos
      setProveedores(await getProveedores());
      // Actualizar vista de detalle con el proveedor actualizado
      const provActualizado = (await getProveedores()).find(p => p.id === proveedorSeleccionado.id);
      setProveedorSeleccionado(provActualizado);
    } catch (error) {
      console.error(error);
      showToast('Error al registrar pago', 'error');
    }
  };

  const handleSubmit = async (e) => {
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
        await updateProveedor(proveedorEditando.id, proveedorData);
        showToast(`Proveedor "${formData.nombre}" actualizado exitosamente`, 'success');
      } else {
        const nuevoProveedor = await addProveedor(proveedorData);
        showToast(`Proveedor "${nuevoProveedor.nombre}" guardado exitosamente`, 'success');
      }

      // Actualizar lista
      setProveedores(await getProveedores());

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

  const confirmarEliminacion = async () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && proveedorAEliminar) {
      try {
        const resultado = await deleteProveedorCascade(proveedorAEliminar.id);
        setProveedores(await getProveedores());
        setCompras(await getCompras());
        setMostrarModalEliminar(false);
        setMostrarDetalle(false);
        setProveedorAEliminar(null);
        setConfirmarTexto('');
        showToast(`Proveedor "${proveedorAEliminar.nombre}" y ${resultado.compras} compras eliminados`, 'success');
      } catch (err) {
        showToast(`Error al eliminar: ${err.message}`, 'error');
      }
    }
  };

  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setProveedorAEliminar(null);
    setConfirmarTexto('');
  };

  // Funciones para eliminar compras
  const iniciarEliminacionCompra = (compra) => {
    setCompraAEliminar(compra);
    setConfirmarTextoCompra('');
    setMostrarModalEliminarCompra(true);
  };

  const confirmarEliminacionCompra = async () => {
    if (confirmarTextoCompra.toLowerCase() === 'eliminar' && compraAEliminar) {
      await deleteCompra(compraAEliminar.id);
      setCompras(await getCompras());
      setMostrarModalEliminarCompra(false);
      setCompraAEliminar(null);
      setConfirmarTextoCompra('');
      showToast('Compra eliminada del historial', 'success');
    }
  };

  const cancelarEliminacionCompra = () => {
    setMostrarModalEliminarCompra(false);
    setCompraAEliminar(null);
    setConfirmarTextoCompra('');
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

  const resetCompraForm = () => {
    setCompraFormData({
      productoId: '',
      cantidad: '',
      precioCompra: '',
      precioVenta: '',
      tipoCompra: 'contado',
      fechaVencimiento: '',
      adjuntoURL: null
    });
  };

  const abrirModalCompra = async () => {
    const allProducts = await getProductos();
    setProductos(allProducts);
    resetCompraForm();
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
          precioCompra: prod.precioCompra ? String(prod.precioCompra) : '',
          precioVenta: prod.precioVenta ? String(prod.precioVenta) : ''
        }));
      }
    }
  };

  const handleRegistrarCompra = async (e) => {
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

      // 🔒 VALIDACIÓN OBLIGATORIA: Factura/Comprobante requerido
      if (!compraFormData.adjuntoURL) {
        setToast({ show: true, message: '⚠️ Debes adjuntar la factura del proveedor para registrar la compra', type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        setGuardando(false);
        return;
      }

      const prod = productos.find(p => p.id === parseInt(productoId));

      // 1. Registrar Compra (genera gasto/deuda y actualiza stock/producto automáticamente ERP)
      await addCompra({
        productoId: parseInt(productoId),
        productoNombre: prod ? prod.nombre : 'Desconocido',
        proveedorId: proveedorSeleccionado.id,
        proveedorNombre: proveedorSeleccionado.nombre,
        cantidad: parseFloat(cantidad),
        unidad: prod ? prod.unidad : 'Unit',
        precioCompra: parseFloat(precioCompra),
        precioVenta: parseFloat(precioVenta),
        tipoCompra: compraFormData.tipoCompra, // 🆕
        fechaVencimiento: compraFormData.fechaVencimiento || null, // 🆕
        adjuntoURL: compraFormData.adjuntoURL, // 🆕 Comprobante adjunto
      });

      // 3. UI Feedback
      setToast({ show: true, message: 'Compra registrada y gasto generado correctamente', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);

      // Actualizar historial localmente
      setCompras(await getCompras());

      // 🆕 REFRESCAR PROVEEDORES EN MEMORIA PARA LA VISTA:
      const proveedoresActualizados = await getProveedores();
      setProveedores(proveedoresActualizados);

      if (proveedorSeleccionado) {
        const provFresco = proveedoresActualizados.find(p => p.id === proveedorSeleccionado.id);
        if (provFresco) {
          setProveedorSeleccionado(provFresco);
        }
      }

      resetCompraForm(); // Garantizar UI limpia
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

      {/* Modal Detalle Compra */}
      {detalleCompra && (
        <div className={styles.modalOverlay} onClick={() => setDetalleCompra(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>📦 Detalle de la Compra</h2>
              <button className={styles.closeButton} onClick={() => setDetalleCompra(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Fecha:</span>
                <span>{parsearFecha(detalleCompra.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Proveedor:</span>
                <span>{detalleCompra.proveedorNombre || 'Desconocido'}</span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Producto:</span>
                <span>{detalleCompra.productoNombre}</span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Cantidad:</span>
                <span>{detalleCompra.cantidad} {detalleCompra.unidad}</span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Costo Unitario:</span>
                <span>{formatearMoneda(detalleCompra.precioCompra)}</span>
              </div>
              <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Total:</span>
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px' }}>
                  {formatearMoneda(detalleCompra.total || (detalleCompra.cantidad * detalleCompra.precioCompra))}
                </span>
              </div>
              {detalleCompra.adjuntoURL && (
                <div className={styles.detalleRow} style={{ marginTop: '15px' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>📄 Factura/Comprobante:</span>
                  <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <a
                      href={detalleCompra.adjuntoURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}
                    >
                      📄 Ver Factura/Comprobante
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calendario de Actividad */}
      {mostrarCalendario && (
        <ActivityCalendar
          type="compras"
          proveedorId={proveedorSeleccionado?.id}
          onClose={() => setMostrarCalendario(false)}
          onActivityClick={(compra) => setDetalleCompra(compra)}
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
                <span className={styles.headerIcon}>🏭</span>
                <div>
                  <h1>Proveedores</h1>
                  <p>Gestión de proveedores</p>
                </div>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.historialButton}
                onClick={() => setMostrarHistorialCompras(true)}
              >
                <span>📋</span> Historial
              </button>
              <button
                className={styles.historialButton}
                onClick={() => setMostrarCalendario(true)}
                style={{ background: '#3b82f6', color: 'white' }}
              >
                <span>📅</span> Calendario
              </button>
              <button
                className={styles.addButton}
                onClick={() => setMostrarFormulario(true)}
              >
                <span>➕</span> Nuevo Proveedor
              </button>
            </div>
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
                      {Number(proveedor.limiteCredito) > 0 && (
                        <span style={{ color: '#059669', fontSize: '0.8rem', marginLeft: '22px' }}>
                          Límite: ${Number(proveedor.limiteCredito).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {(Number(proveedor.saldoPendiente) > 0) && (
                        <div style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ Saldo Deudor: {formatearMoneda(proveedor.saldoPendiente)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      💵 Solo Contado
                    </span>
                  )}
                </div>

                <div className={styles.cardActionsColumn}>
                  <button
                    className={styles.btnActionFull}
                    onClick={() => {
                      setProveedorSeleccionado(proveedor);
                      // Next frame to ensure state set before modal open
                      setTimeout(abrirModalCompra, 0);
                    }}
                    title="Registrar Compra"
                    style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#059669' }}
                  >
                    📥 Registrar Compra
                  </button>
                  <button
                    className={styles.btnActionFull}
                    onClick={() => {
                      setProveedorSeleccionado(proveedor);
                      setMostrarModalAbono(true);
                    }}
                    title="Registrar Pago"
                  >
                    💸 Registrar Pago
                  </button>
                  <button
                    className={styles.btnActionFull}
                    onClick={() => verDetalle(proveedor)}
                    title="Ver Detalles"
                  >
                    📋 Ver Detalles / Historial
                  </button>
                  <button
                    className={styles.btnActionFull}
                    onClick={() => cambiarEstado(proveedor)}
                    title={proveedor.estado === 'activo' ? 'Suspender' : 'Activar'}
                  >
                    {proveedor.estado === 'activo' ? '⏸️ Suspender' : '▶️ Activar'}
                  </button>
                  <button
                    className={styles.btnActionFull}
                    onClick={() => iniciarEdicion(proveedor)}
                    title="Editar Proveedor"
                  >
                    ✏️ Editar Proveedor
                  </button>
                  <button
                    className={`${styles.btnActionFull} ${styles.btnDeleteFull}`}
                    onClick={() => iniciarEliminacion(proveedor)}
                    title="Eliminar"
                  >
                    🗑️ Eliminar
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

                  {/* 🆕 Dashboard de Crédito Visual */}
                  <div className={styles.detalleSection} style={{ borderLeft: '4px solid #f59e0b' }}>
                    <h4 style={{ color: '#d97706' }}>💰 Estado de Cuenta</h4>

                    {proveedorSeleccionado.ofreceCredito && proveedorSeleccionado.limiteCredito > 0 ? (() => {
                      const limite = Number(proveedorSeleccionado.limiteCredito) || 0;
                      const utilizado = Number(proveedorSeleccionado.saldoPendiente) || 0;
                      const disponible = Math.max(0, limite - utilizado);
                      const porcentaje = limite > 0 ? Math.min(100, (utilizado / limite) * 100) : 0;
                      const colorBarra = porcentaje > 80 ? '#ef4444' : porcentaje > 50 ? '#f59e0b' : '#10b981';
                      return (
                        <>
                          {/* Métricas numéricas */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ textAlign: 'center', padding: '10px', background: '#f0f9ff', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Límite Total</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e40af' }}>{formatearMoneda(limite)}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Utilizado</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' }}>{formatearMoneda(utilizado)}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px', background: '#f0fdf4', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Disponible</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>{formatearMoneda(disponible)}</div>
                            </div>
                          </div>
                          {/* Barra de progreso dual */}
                          <div style={{ background: '#e5e7eb', borderRadius: '10px', height: '18px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                              width: `${porcentaje}%`, height: '100%',
                              background: `linear-gradient(90deg, ${colorBarra}, ${colorBarra}dd)`,
                              borderRadius: '10px', transition: 'width 0.5s ease',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {porcentaje > 15 && (
                                <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: '700' }}>{porcentaje.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: '#9ca3af' }}>
                            <span>0%</span>
                            <span>{porcentaje.toFixed(0)}% utilizado</span>
                            <span>100%</span>
                          </div>
                        </>
                      );
                    })() : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.9rem', color: '#666' }}>Saldo Pendiente por Pagar:</span>
                          <h2 style={{
                            color: (proveedorSeleccionado.saldoPendiente || 0) > 0 ? '#ef4444' : '#10b981',
                            margin: '5px 0'
                          }}>
                            {formatearMoneda(proveedorSeleccionado.saldoPendiente || 0)}
                          </h2>
                        </div>
                      </div>
                    )}

                    {(proveedorSeleccionado.saldoPendiente || 0) > 0 && (
                      <button
                        className={styles.btnPrimary}
                        onClick={() => setMostrarModalAbono(true)}
                        style={{ padding: '8px 16px', fontSize: '0.9rem', marginTop: '10px', width: '100%' }}
                      >
                        💸 Registrar Pago
                      </button>
                    )}
                  </div>

                  {/* 🆕 Últimos Movimientos Unificados */}
                  <div className={styles.detalleSection}>
                    <h4>📊 Últimos Movimientos</h4>
                    {(() => {
                      const comprasDelProv = compras
                        .filter(c => c.proveedorId === proveedorSeleccionado.id)
                        .map(c => ({ ...c, _tipo: 'compra', _fecha: new Date(c.fecha) }));
                      const pagosDelProv = (proveedorSeleccionado.historialAbonos || [])
                        .map(a => ({ ...a, _tipo: 'pago', _fecha: new Date(a.fecha) }));
                      const todosMovimientos = [...comprasDelProv, ...pagosDelProv]
                        .sort((a, b) => b._fecha - a._fecha)
                        .slice(0, 10);

                      if (todosMovimientos.length === 0) {
                        return <p style={{ color: '#9ca3af', textAlign: 'center', padding: '15px' }}>Sin movimientos registrados</p>;
                      }
                      return (
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {todosMovimientos.map((mov, idx) => (
                            <div key={idx} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 12px', borderBottom: '1px solid #f3f4f6',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.1rem' }}>{mov._tipo === 'compra' ? '🛒' : '💸'}</span>
                                <div>
                                  <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                    {mov._tipo === 'compra' ? (mov.productoNombre || 'Compra') : `Pago - ${(mov.metodoPago || 'efectivo').toUpperCase()}`}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatearFecha(mov.fecha)}</div>
                                </div>
                              </div>
                              <span style={{
                                fontWeight: '700',
                                color: mov._tipo === 'compra' ? '#ef4444' : '#10b981'
                              }}>
                                {mov._tipo === 'compra' ? '-' : '+'}{formatearMoneda(mov._tipo === 'compra' ? (mov.total || mov.cantidad * mov.precioCompra) : mov.monto)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
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
                      {subiendoImagenProveedor ? (
                        <div style={{ padding: '20px', textAlign: 'center', background: '#f3f4f6', borderRadius: '8px' }}>
                          ⏳ Subiendo imagen...
                        </div>
                      ) : formData.imagenURL ? (
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
                            value={formData.limiteCredito}
                            onChange={(val) => setFormData(prev => ({...prev, limiteCredito: val}))}
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
                  disabled={guardando || subiendoImagenProveedor}
                  style={{ opacity: (guardando || subiendoImagenProveedor) ? 0.7 : 1 }}
                >
                  {guardando ? '⏳ Guardando...' : subiendoImagenProveedor ? '⏳ Subiendo Imagen...' : '💾 Guardar Proveedor'}
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
                    Esta acción eliminará permanentemente:<br />
                    • Proveedor: <strong>{proveedorAEliminar.nombre}</strong><br />
                    • Contacto: {proveedorAEliminar.contacto}<br />
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

                    {/* 🆕 Filtros por Categoría */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '8px' }}>
                      {['Todas', 'Res', 'Cerdo', 'Pollo', 'Embutidos'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFiltroCategoriaCompra(cat);
                            setCompraFormData(prev => ({ ...prev, productoId: '' })); // Reset dropdown selection when filter changes
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: '1px solid #e5e7eb',
                            background: filtroCategoriaCompra === cat ? '#1e40af' : '#fff',
                            color: filtroCategoriaCompra === cat ? '#fff' : '#374151',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                          }}
                        >
                          {cat !== 'Todas' && getCategoriaIcon(cat)} {cat}
                        </button>
                      ))}
                    </div>

                    <select
                      name="productoId"
                      value={compraFormData.productoId}
                      onChange={handleCompraInputChange}
                      required
                    >
                      <option value="">-- Selecciona un producto --</option>
                      {productos
                        .filter(p => filtroCategoriaCompra === 'Todas' || (p.categoria && p.categoria.toLowerCase() === filtroCategoriaCompra.toLowerCase()))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock} {p.unidad})</option>
                        ))}
                    </select>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Cantidad (KG / PZ / PAQ) *</label>
                      <CurrencyInput
                        prefix=""
                        value={compraFormData.cantidad}
                        onChange={(val) => setCompraFormData(prev => ({...prev, cantidad: val}))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Costo Unitario ($) *</label>
                      <CurrencyInput
                        value={compraFormData.precioCompra}
                        onChange={(val) => setCompraFormData(prev => ({...prev, precioCompra: val}))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Nuevo Precio Venta ($) *</label>
                    <CurrencyInput
                      value={compraFormData.precioVenta}
                      onChange={(val) => setCompraFormData(prev => ({...prev, precioVenta: val}))}
                      placeholder="0.00"
                    />
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                      Se actualizará el precio público de este producto.
                    </p>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Tipo de Compra</label>
                      <select
                        name="tipoCompra"
                        value={compraFormData.tipoCompra}
                        onChange={handleCompraInputChange}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
                      >
                        <option value="contado">💵 Contado</option>
                        <option value="credito">💳 Crédito</option>
                      </select>
                    </div>

                    {compraFormData.tipoCompra === 'credito' && (
                      <div className={styles.formGroup}>
                        <label>Fecha Vencimiento</label>
                        <input
                          type="date"
                          name="fechaVencimiento"
                          value={compraFormData.fechaVencimiento}
                          onChange={handleCompraInputChange}
                          required
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
                        />
                      </div>
                    )}
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
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 20 * 1024 * 1024) {
                              setToast({ show: true, message: '⚠️ Archivo muy grande (máx 20MB)', type: 'warning' });
                              setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
                              return;
                            }

                            try {
                              setSubiendoAdjuntoCompra(true);
                              // Determinar carpeta basada en tipo
                              const folder = file.type.includes('pdf') ? 'compras/documentos' : 'compras/imagenes';
                              const url = await uploadImage(file, folder);
                              setCompraFormData(prev => ({ ...prev, adjuntoURL: url }));
                              showToast('Adjunto subido correctamente', 'success');
                            } catch (error) {
                              console.error('Error subiendo adjunto:', error);
                              showToast('Error al subir adjunto', 'error');
                            } finally {
                              setSubiendoAdjuntoCompra(false);
                            }
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
                    {subiendoAdjuntoCompra ? (
                      <div style={{ marginTop: '10px', textAlign: 'center', color: '#6b7280' }}>
                        ⏳ Subiendo adjunto...
                      </div>
                    ) : compraFormData.adjuntoURL && (
                      <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        {compraFormData.adjuntoURL.toString().includes('firebase') && !compraFormData.adjuntoURL.toString().includes('.pdf') ? (
                          <img
                            src={compraFormData.adjuntoURL}
                            alt="Vista previa"
                            style={{ maxWidth: '150px', maxHeight: '100px', borderRadius: '8px', border: '1px solid #ddd' }}
                          />
                        ) : (
                          <span style={{ color: '#059669', fontSize: '0.9rem' }}>📄 Documento adjunto</span>
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
                  disabled={guardando || subiendoAdjuntoCompra}
                  style={{ opacity: (guardando || subiendoAdjuntoCompra) ? 0.7 : 1 }}
                >
                  {guardando ? '⏳ Guardando...' : subiendoAdjuntoCompra ? '⏳ Subiendo...' : '💾 Registrar Compra'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Modal Registrar Abono */}
      {mostrarModalAbono && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalAbono(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className={styles.modalHeader}>
              <h2>💸 Registrar Pago a Proveedor</h2>
              <button
                className={styles.closeButton}
                onClick={() => setMostrarModalAbono(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <form id="form-abono-proveedor" onSubmit={handleRegistrarAbono} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Proveedor</label>
                  <input type="text" value={proveedorSeleccionado?.nombre} disabled className={styles.input} />
                </div>

                <div className={styles.formGroup}>
                  <label>Saldo Pendiente</label>
                  <div style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '10px' }}>
                    {formatearMoneda(proveedorSeleccionado?.saldoPendiente || 0)}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Monto a Pagar</label>
                  <CurrencyInput
                    value={abonoData.monto}
                    onChange={(val) => setAbonoData(prev => ({ ...prev, monto: val }))}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: 'white'
                    }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Método de Pago</label>
                  <select
                    className={styles.input}
                    value={abonoData.metodoPago}
                    onChange={e => setAbonoData(prev => ({ ...prev, metodoPago: e.target.value }))}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Fecha del Pago</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={abonoData.fecha}
                    onChange={e => setAbonoData(prev => ({ ...prev, fecha: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Vincular a Compra (Opcional)</label>
                  <select
                    className={styles.input}
                    onChange={(e) => {
                      const compra = comprasProveedor.find(c => c.id === parseInt(e.target.value));
                      if (compra) {
                        setAbonoData(prev => ({
                          ...prev,
                          nota: `Pago de: ${compra.productoNombre} (${formatearFecha(compra.fecha)}) - Ref: ${compra.id}`
                        }));
                      }
                    }}
                  >
                    <option value="">-- Seleccionar Compra --</option>
                    {comprasProveedor.map(compra => (
                      <option key={compra.id} value={compra.id}>
                        {formatearFecha(compra.fecha)} - {compra.productoNombre} ({formatearMoneda(compra.total)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Nota (Opcional)</label>
                  <textarea
                    className={styles.input}
                    value={abonoData.nota}
                    onChange={e => setAbonoData(prev => ({ ...prev, nota: e.target.value }))}
                    rows="2"
                    placeholder="Referencia, folio, etc."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Comprobante de Pago (Opcional)</label>
                  <div style={{ marginTop: '8px' }}>
                    <ImageDropzone
                      onImageSave={(base64) => setAbonoData(prev => ({ ...prev, comprobanteURL: base64 }))}
                      previewUrl={abonoData.comprobanteURL}
                      onRemove={() => setAbonoData(prev => ({ ...prev, comprobanteURL: null }))}
                      label="Arrastra un comprobante aquí o haz clic para seleccionar"
                    />
                  </div>
                </div>

              </form>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setMostrarModalAbono(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-abono-proveedor"
                className={styles.btnPrimary}
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Compras */}
      {mostrarHistorialCompras && (
        <div className={styles.modalOverlay} onClick={() => setMostrarHistorialCompras(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>📋 Historial de Compras</h2>
              <button className={styles.closeButton} onClick={() => setMostrarHistorialCompras(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {compras.length === 0 ? (
                <div className={styles.emptyState}>
                  📭 No hay compras registradas
                </div>
              ) : (
                <div className={styles.historialList}>
                  {compras.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map((compra) => (
                    <div key={compra.id} className={styles.historialItem}>
                      <div className={styles.historialHeader}>
                        <span className={styles.historialIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>
                          📦
                        </span>
                        <span className={styles.historialFecha}>{formatearFecha(compra.fecha)}</span>
                      </div>
                      <div className={styles.historialBody}>
                        <span className={styles.historialProducto}>{compra.productoNombre}</span>
                        <span className={styles.historialProveedor}>{compra.proveedorNombre}</span>
                      </div>
                      <div className={styles.historialFooter}>
                        <span className={styles.historialCantidad}>
                          {compra.cantidad} {compra.unidad}
                        </span>
                        <div className={styles.historialActions}>
                          <span className={styles.historialMonto}>{formatearMoneda(compra.total)}</span>
                          <button
                            className={styles.btnEliminarHistorial}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', border: '1px solid #fca5a5',
                              background: '#fef2f2', color: '#dc2626', fontWeight: '600',
                              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              iniciarEliminacionCompra(compra);
                            }}
                            title="Eliminar compra"
                          >
                            <span>🗑️</span> Eliminar Compra
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

      {/* Modal Confirmar Eliminación de Compra */}
      {mostrarModalEliminarCompra && (
        <div className={styles.modalOverlay} onClick={cancelarEliminacionCompra}>
          <div className={`${styles.modal} ${styles.modalEliminar}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>⚠️ Confirmar Eliminación</h2>
              <button className={styles.closeButton} onClick={cancelarEliminacionCompra}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.deleteWarning}>
                <span className={styles.warningIcon}>🚨</span>
                <div className={styles.warningContent}>
                  <h3>¿Estás seguro de eliminar esta compra?</h3>
                  <p>Esta acción no se puede deshacer.</p>
                  {compraAEliminar && (
                    <div className={styles.deleteDetails}>
                      <span><strong>{compraAEliminar.productoNombre}</strong></span>
                      <span>{compraAEliminar.cantidad} {compraAEliminar.unidad} - {formatearMoneda(compraAEliminar.total)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.confirmInput}>
                <label>Escribe <strong>"eliminar"</strong> para confirmar:</label>
                <input
                  type="text"
                  value={confirmarTextoCompra}
                  onChange={(e) => setConfirmarTextoCompra(e.target.value)}
                  placeholder="Escribe eliminar"
                  autoFocus
                />
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={cancelarEliminacionCompra}
                >
                  Cancelar
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={confirmarEliminacionCompra}
                  disabled={confirmarTextoCompra.toLowerCase() !== 'eliminar'}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
