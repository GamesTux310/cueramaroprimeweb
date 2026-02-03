'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './productos.module.css';
import { getProductos, addProducto, updateProducto, saveProductos, actualizarStock, getProveedores, addCompra } from '@/lib/storage';
import ImageModal from '@/components/ImageModal';
import CurrencyInput from '@/components/CurrencyInput';

const categorias = ['Todas', 'Res', 'Cerdo', 'Pollo', 'Embutidos'];

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]); // Nuevo estado para proveedores
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroStock, setFiltroStock] = useState('todos');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [vistaGrid, setVistaGrid] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  // Estado para Modal Stock
  const [mostrarModalStock, setMostrarModalStock] = useState(false);
  const [productoStock, setProductoStock] = useState(null);
  const [cantidadStock, setCantidadStock] = useState('');
  
  // Nuevos estados para compra
  const [esCompra, setEsCompra] = useState(false);
  const [proveedorId, setProveedorId] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState('');
  
  const [modalImagen, setModalImagen] = useState({ show: false, url: '' });
  
  // Estados para eliminación segura
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [confirmarTexto, setConfirmarTexto] = useState('');
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    unidad: 'KG', // Default uppercase
    estado: 'Fresco',
    descripcion: '',
    precioCompra: '',
    precioVenta: '',
    stock: '',
    stockMinimo: '10',
  });

  // Cargar productos y proveedores al montar
  useEffect(() => {
    setProductos(getProductos());
    setProveedores(getProveedores());
  }, []);

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                             producto.categoria.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = filtroCategoria === 'Todas' || producto.categoria === filtroCategoria;
    const coincideStock = filtroStock === 'todos' || 
                         (filtroStock === 'bajo' && producto.stock <= producto.stockMinimo) ||
                         (filtroStock === 'normal' && producto.stock > producto.stockMinimo);
    return coincideBusqueda && coincideCategoria && coincideStock;
  });

  // Estadísticas
  const totalProductos = productos.length;
  const productosStockBajo = productos.filter(p => p.stock <= p.stockMinimo).length;
  const valorInventario = productos.reduce((sum, p) => sum + (p.precioVenta * p.stock), 0);
  const margenPromedio = productos.length > 0 
    ? productos.reduce((sum, p) => sum + ((p.precioVenta - p.precioCompra) / p.precioCompra * 100), 0) / productos.length
    : 0;

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cantidad);
  };

  const calcularMargen = (compra, venta) => {
    if (!compra || compra === 0) return '0.0';
    return ((venta - compra) / compra * 100).toFixed(1);
  };

  const getStockStatus = (producto) => {
    if (producto.stock <= producto.stockMinimo * 0.5) return 'critico';
    if (producto.stock <= producto.stockMinimo) return 'bajo';
    return 'normal';
  };

  const getCategoriaIcon = (categoria) => {
    const iconos = {
      'Res': '🥩',
      'Cerdo': '🐷',
      'Pollo': '🍗',
      'Embutidos': '🌭',
    };
    return iconos[categoria] || '🍖';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Forzar mayúsculas en campos de texto específicos
    if (name === 'nombre' || name === 'descripcion' || name === 'categoria') {
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setGuardando(true);

    // Validar campos requeridos
    if (!formData.nombre || !formData.categoria || !formData.precioCompra || !formData.precioVenta) {
      showToast('Por favor llena todos los campos requeridos', 'warning');
      setGuardando(false);
      return;
    }

    const productoData = {
      nombre: formData.nombre,
      categoria: formData.categoria,
      unidad: formData.unidad,
      estado: formData.estado,
      descripcion: formData.descripcion || '',
      precioCompra: parseFloat(formData.precioCompra),
      precioVenta: parseFloat(formData.precioVenta),
      stock: parseInt(formData.stock) || 0,
      stockMinimo: parseInt(formData.stockMinimo) || 10,
      imagenURL: formData.imagenURL,
    };

    try {
      if (productoEditar) {
        // Actualizar producto existente
        updateProducto(productoEditar.id, productoData);
        showToast(`Producto "${productoData.nombre}" actualizado`, 'success');
      } else {
        // Agregar nuevo producto
        addProducto(productoData);
        showToast(`Producto "${productoData.nombre}" guardado`, 'success');
      }

      // Actualizar lista de productos
      setProductos(getProductos());

      // Limpiar formulario y cerrar modal
      setFormData({
        nombre: '',
        categoria: '',
        unidad: 'KG',
        estado: 'Fresco',
        descripcion: '',
        precioCompra: '',
        precioVenta: '',
        stock: '',
        stockMinimo: '10',
        imagenURL: null, // Reset imagen
      });
      setProductoEditar(null);
      setMostrarFormulario(false);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        alert('⚠️ Error: No hay suficiente espacio para guardar la imagen. Intenta usar una imagen más pequeña (<500KB) o elimina datos antiguos.');
      } else {
        alert('Ocurrió un error al guardar el producto: ' + error.message);
      }
    } finally {
      setGuardando(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const iniciarEliminacion = (producto) => {
    setProductoAEliminar(producto);
    setConfirmarTexto('');
    setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = () => {
    if (confirmarTexto.toLowerCase() === 'eliminar' && productoAEliminar) {
      const productosActualizados = productos.filter(p => p.id !== productoAEliminar.id);
      saveProductos(productosActualizados);
      setProductos(productosActualizados);
      setMostrarModalEliminar(false);
      setProductoAEliminar(null);
      setConfirmarTexto('');
      showToast(`Producto "${productoAEliminar.nombre}" eliminado`, 'success');
    }
  };

  const procesarImagen = (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes', 'warning');
      return;
    }
    
    // Advertencia    // Validar tamaño (10MB)
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
    if (file) {
      procesarImagen(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#3b82f6';
    e.currentTarget.style.background = '#eff6ff';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--gray-300)';
    e.currentTarget.style.background = 'var(--gray-50)';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--gray-300)';
    e.currentTarget.style.background = 'var(--gray-50)';
    const file = e.dataTransfer.files[0];
    if (file) {
      procesarImagen(file);
    }
  };

  const eliminarImagenForm = () => {
    setFormData(prev => ({ ...prev, imagenURL: null }));
  };

  const cancelarEliminacion = () => {
    setMostrarModalEliminar(false);
    setProductoAEliminar(null);
    setConfirmarTexto('');
  };

  const editarProducto = (producto) => {
    setProductoEditar(producto);
    setFormData({
      nombre: producto.nombre,
      categoria: producto.categoria ? producto.categoria.toUpperCase() : '',
      unidad: producto.unidad ? producto.unidad.toUpperCase() : 'KG',
      estado: producto.estado || 'Fresco',
      descripcion: producto.descripcion || '',
      precioCompra: producto.precioCompra.toString(),
      precioVenta: producto.precioVenta.toString(),
      stock: producto.stock.toString(),
      stockMinimo: producto.stockMinimo.toString(),
      imagenURL: producto.imagenURL || null,
    });
    setMostrarFormulario(true);
  };

  const abrirModalStock = (producto) => {
    setProductoStock(producto);
    setCantidadStock('');
    // Reset compra values
    setEsCompra(false);
    setProveedorId('');
    setPrecioCompra(producto.precioCompra.toString());
    setNuevoPrecioVenta(producto.precioVenta.toString());
    setMostrarModalStock(true);
  };

  const agregarStock = (tipo) => {
    if (!cantidadStock || parseInt(cantidadStock) <= 0) {
      showToast('Ingresa una cantidad válida', 'warning');
      return;
    }

    // Lógica de Compra
    if (tipo === 'agregar' && esCompra) {
      if (!proveedorId) {
        showToast('Selecciona un proveedor', 'warning');
        return;
      }
      
      const cantidad = parseInt(cantidadStock);
      const precioC = parseFloat(precioCompra) || 0;
      const precioV = parseFloat(nuevoPrecioVenta) || 0;
      const proveedor = proveedores.find(p => p.id === parseInt(proveedorId));

      // 1. Registrar Compra
      addCompra({
        productoId: productoStock.id,
        productoNombre: productoStock.nombre,
        proveedorId: parseInt(proveedorId),
        proveedorNombre: proveedor ? proveedor.nombre : 'Desconocido',
        cantidad: cantidad,
        unidad: productoStock.unidad || 'KG',
        precioCompra: precioC,
        precioVenta: precioV
      });

      // 2. Actualizar Precios si cambiaron
      if (precioC !== productoStock.precioCompra || precioV !== productoStock.precioVenta) {
        updateProducto(productoStock.id, {
          precioCompra: precioC,
          precioVenta: precioV
        });
      }
    }

    actualizarStock(productoStock.id, parseInt(cantidadStock), tipo);
    setProductos(getProductos());
    setMostrarModalStock(false);
    showToast(`Stock ${tipo === 'agregar' ? 'agregado' : 'restado'} correctamente`, 'success');
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
      
      {/* Modal de Imagen Ampliada */}
      {modalImagen.show && (
        <ImageModal
          imageUrl={modalImagen.url}
          onClose={() => setModalImagen({ show: false, url: '' })}
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
              <span className={styles.headerIcon}>📦</span>
              <div>
                <h1>Productos</h1>
                <p>Administrar inventario</p>
              </div>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.viewToggle}>
              <button 
                className={`${styles.viewBtn} ${vistaGrid ? styles.active : ''}`}
                onClick={() => setVistaGrid(true)}
              >
                ▦
              </button>
              <button 
                className={`${styles.viewBtn} ${!vistaGrid ? styles.active : ''}`}
                onClick={() => setVistaGrid(false)}
              >
                ☰
              </button>
            </div>
            <button 
              className={styles.addButton}
              onClick={() => {
                setProductoEditar(null);
                setFormData({
                  nombre: '',
                  categoria: '',
                  unidad: 'kg',
                  estado: 'Fresco',
                  descripcion: '',
                  precioCompra: '',
                  precioVenta: '',
                  stock: '',
                  stockMinimo: '10',
                  imagenURL: null
                });
                setMostrarFormulario(true);
              }}
            >
              <span>➕</span> Nuevo Producto
            </button>
          </div>
        </div>
      </header>

      {/* Estadísticas */}
      <section className={styles.statsSection}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>📦</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{totalProductos}</span>
            <span className={styles.statLabel}>Total Productos</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>⚠️</div>
          <div className={styles.statInfo}>
            <span className={`${styles.statValue} ${productosStockBajo > 0 ? styles.danger : ''}`}>
              {productosStockBajo}
            </span>
            <span className={styles.statLabel}>Stock Bajo</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>💰</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{formatearMoneda(valorInventario)}</span>
            <span className={styles.statLabel}>Valor Inventario</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>📈</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{margenPromedio.toFixed(1)}%</span>
            <span className={styles.statLabel}>Margen Promedio</span>
          </div>
        </div>
      </section>

      {/* Alertas de Stock Bajo */}
      {productosStockBajo > 0 && (
        <section className={styles.alertSection}>
          <div className={styles.alert}>
            <span className={styles.alertIcon}>⚠️</span>
            <div className={styles.alertContent}>
              <strong>¡Atención!</strong> Hay {productosStockBajo} producto(s) con stock bajo que requieren reabastecimiento:
              <span className={styles.alertProducts}>
                {productos.filter(p => p.stock <= p.stockMinimo).map(p => p.nombre).join(', ')}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Filtros */}
      <section className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.categoriasTabs}>
          {categorias.map(cat => (
            <button
              key={cat}
              className={`${styles.categoriaTab} ${filtroCategoria === cat ? styles.active : ''}`}
              onClick={() => setFiltroCategoria(cat)}
            >
              {cat !== 'Todas' && getCategoriaIcon(cat)} {cat}
            </button>
          ))}
        </div>
        <select 
          value={filtroStock} 
          onChange={(e) => setFiltroStock(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="todos">Todo el stock</option>
          <option value="bajo">⚠️ Stock bajo</option>
          <option value="normal">✅ Stock normal</option>
        </select>
      </section>

      {/* Grid de Productos */}
      {vistaGrid ? (
        <section className={styles.productsGrid}>
          {productosFiltrados.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#666' }}>
              {productos.length === 0 
                ? '📭 No hay productos registrados. ¡Agrega el primero!' 
                : '🔍 No se encontraron productos con esos filtros'}
            </div>
          ) : (
            productosFiltrados.map((producto) => (
              <div key={producto.id} className={styles.productCard}>
                <div className={styles.productImage}>
                  {producto.imagenURL ? (
                    <img 
                      src={producto.imagenURL} 
                      alt={producto.nombre}
                      className={styles.productImg}
                      onClick={() => setModalImagen({ show: true, url: producto.imagenURL })}
                    />
                  ) : (
                    <span className={styles.productEmoji}>{getCategoriaIcon(producto.categoria)}</span>
                  )}
                  <span className={`${styles.stockBadge} ${styles[getStockStatus(producto)]}`}>
                    {producto.stock} {producto.unidad}
                  </span>
                </div>
                <div className={styles.productInfo}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <span className={styles.productCategory}>{producto.categoria}</span>
                    <span style={{ fontSize:'0.8rem', background:'#f3f4f6', padding:'2px 8px', borderRadius:'12px', color:'#4b5563' }}>
                      {producto.estado || 'Fresco'}
                    </span>
                  </div>
                  <h3 className={styles.productName}>{producto.nombre}</h3>
                  <p className={styles.productDesc}>{producto.descripcion}</p>
                  
                  <div className={styles.priceSection}>
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>Compra</span>
                      <span className={styles.priceValue}>{formatearMoneda(producto.precioCompra)}</span>
                    </div>
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>Venta</span>
                      <span className={`${styles.priceValue} ${styles.venta}`}>{formatearMoneda(producto.precioVenta)}</span>
                    </div>
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>Margen</span>
                      <span className={`${styles.priceValue} ${styles.margen}`}>
                        +{calcularMargen(producto.precioCompra, producto.precioVenta)}%
                      </span>
                    </div>
                  </div>

                  <div className={styles.stockBar}>
                    <div className={styles.stockBarLabel}>
                      <span>Stock: {producto.stock} / Min: {producto.stockMinimo}</span>
                      {producto.stock <= producto.stockMinimo && <span className={styles.stockWarning}>⚠️ Bajo</span>}
                    </div>
                    <div className={styles.stockBarTrack}>
                      <div 
                        className={`${styles.stockBarFill} ${styles[getStockStatus(producto)]}`}
                        style={{ width: `${Math.min((producto.stock / (producto.stockMinimo * 2)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className={styles.productActions}>
                    <button 
                      className={styles.btnAction} 
                      title="Editar"
                      onClick={() => editarProducto(producto)}
                    >
                      ✏️
                    </button>
                    <button 
                      className={styles.btnAction} 
                      title="Agregar stock"
                      onClick={() => abrirModalStock(producto)}
                    >
                      📥
                    </button>
                    <button 
                      className={styles.btnAction} 
                      title="Eliminar"
                      onClick={() => iniciarEliminacion(producto)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      ) : (
        /* Vista de Lista */
        <section className={styles.tableSection}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Precio Compra</th>
                  <th>Precio Venta</th>
                  <th>Margen</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      {productos.length === 0 
                        ? '📭 No hay productos registrados' 
                        : '🔍 No se encontraron productos'}
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((producto) => (
                    <tr key={producto.id}>
                      <td>
                        <div className={styles.productCell}>
                          {producto.imagenURL ? (
                            <img 
                              src={producto.imagenURL} 
                              alt="miniatura"
                              className={styles.productImgSmall}
                              onClick={() => setModalImagen({ show: true, url: producto.imagenURL })}
                            />
                          ) : (
                            <span className={styles.productCellIcon}>{getCategoriaIcon(producto.categoria)}</span>
                          )}
                          <div>
                            <span className={styles.productCellName}>{producto.nombre}</span>
                            <span className={styles.productCellDesc}>{producto.descripcion}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className={styles.categoryBadge}>{producto.categoria}</span></td>
                      <td>
                        <span style={{ fontSize:'0.85rem', color:'#4b5563', padding:'4px 8px', background:'#f9fafb', borderRadius:'6px', border:'1px solid #e5e7eb' }}>
                          {producto.estado || 'Fresco'}
                        </span>
                      </td>
                      <td>{formatearMoneda(producto.precioCompra)}</td>
                      <td className={styles.precioVenta}>{formatearMoneda(producto.precioVenta)}</td>
                      <td><span className={styles.margenBadge}>+{calcularMargen(producto.precioCompra, producto.precioVenta)}%</span></td>
                      <td>
                        <span className={`${styles.stockValue} ${styles[getStockStatus(producto)]}`}>
                          {producto.stock} {producto.unidad}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[getStockStatus(producto)]}`}>
                          {getStockStatus(producto) === 'normal' && '✅ OK'}
                          {getStockStatus(producto) === 'bajo' && '⚠️ Bajo'}
                          {getStockStatus(producto) === 'critico' && '🔴 Crítico'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.acciones}>
                          <button 
                            className={styles.btnAccion} 
                            title="Editar"
                            onClick={() => editarProducto(producto)}
                          >
                            ✏️
                          </button>
                          <button 
                            className={styles.btnAccion} 
                            title="Agregar stock"
                            onClick={() => abrirModalStock(producto)}
                          >
                            📥
                          </button>
                          <button 
                            className={styles.btnAccion} 
                            title="Eliminar"
                            onClick={() => iniciarEliminacion(producto)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal Nuevo/Editar Producto */}
      {mostrarFormulario && (
        <div className={styles.modalOverlay} onClick={() => setMostrarFormulario(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{productoEditar ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h2>
              <button className={styles.closeButton} onClick={() => setMostrarFormulario(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <form className={styles.form} onSubmit={handleSubmit}>
                {/* Sección de Imagen */}
                <div className={styles.formSection}>
                  <div className={styles.imagePreviewContainer}>
                    {formData.imagenURL ? (
                      <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
                         <img 
                           src={formData.imagenURL} 
                           alt="Vista previa" 
                           className={styles.imagePreview}
                         />
                         <button 
                           type="button"
                           className={styles.btnRemoveImage}
                           onClick={() => setFormData(prev => ({ ...prev, imagenURL: null }))}
                           style={{ position: 'absolute', top: '10px', right: '10px' }}
                         >
                           ✕ Quitar
                         </button>
                      </div>
                    ) : (
                      <div className={styles.fileInputContainer}>
                        <label 
                          className={styles.fileInputLabel}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <span>📸 Agregar foto del producto</span>
                          <p style={{fontSize: '0.9rem', color: '#6b7280', margin: 0}}>Arrastra tu imagen aquí o haz clic para seleccionar</p>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className={styles.fileInput}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.formSection}>
                  <h4>📦 Información del Producto</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Nombre del Producto *</label>
                      <input 
                        type="text" 
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        placeholder="Ej: Bistec de Res" 
                        required 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Categoría *</label>
                      <select 
                        name="categoriaSelect"
                        value={['RES', 'CERDO', 'POLLO', 'EMBUTIDOS', 'LACTEOS', 'ABARROTES', 'FRUTAS Y VERDURAS', 'TOSTADAS/BOTANAS', 'DESECHABLES', 'CARBON/LEÑA', 'SALSAS'].includes(formData.categoria) ? formData.categoria : (formData.categoria ? 'OTROS' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTROS') {
                            setFormData(prev => ({ ...prev, categoria: '' })); // Limpiar para que escriban
                          } else {
                            handleInputChange({ target: { name: 'categoria', value: val } });
                          }
                        }}
                        className={styles.selectInput}
                        required={!formData.categoria}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="RES">RES</option>
                        <option value="CERDO">CERDO</option>
                        <option value="POLLO">POLLO</option>
                        <option value="EMBUTIDOS">EMBUTIDOS</option>
                        <option value="LACTEOS">LÁCTEOS</option>
                        <option value="ABARROTES">ABARROTES</option>
                        <option value="FRUTAS Y VERDURAS">FRUTAS Y VERDURAS</option>
                        <option value="TOSTADAS/BOTANAS">TOSTADAS/BOTANAS</option>
                        <option value="DESECHABLES">DESECHABLES</option>
                        <option value="CARBON/LEÑA">CARBÓN/LEÑA</option>
                        <option value="SALSAS">SALSAS</option>
                        <option value="OTROS">OTROS (Escribir manual)</option>
                      </select>
                      
                      {/* Input manual si es OTROS o no está en la lista */}
                      {(!['RES', 'CERDO', 'POLLO', 'EMBUTIDOS', 'LACTEOS', 'ABARROTES', 'FRUTAS Y VERDURAS', 'TOSTADAS/BOTANAS', 'DESECHABLES', 'CARBON/LEÑA', 'SALSAS'].includes(formData.categoria) && formData.categoria !== undefined) && (
                        <input 
                          type="text"
                          name="categoria"
                          value={formData.categoria}
                          onChange={handleInputChange}
                          placeholder="Escribe el nombre de la categoría..."
                          className={styles.input}
                          style={{ marginTop: '10px' }}
                          required
                          autoFocus
                        />
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label>Unidad de Medida *</label>
                      <select
                        name="unidadSelect"
                        value={['KG', 'PIEZA', 'PAQUETE', 'LITRO', 'CAJA'].includes(formData.unidad) ? formData.unidad : (formData.unidad ? 'OTROS' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTROS') {
                            setFormData(prev => ({ ...prev, unidad: '' }));
                          } else {
                            handleInputChange({ target: { name: 'unidad', value: val } });
                          }
                        }}
                        className={styles.selectInput}
                        required={!formData.unidad}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="KG">KG</option>
                        <option value="PIEZA">PIEZA</option>
                        <option value="PAQUETE">PAQUETE</option>
                        <option value="LITRO">LITRO</option>
                        <option value="CAJA">CAJA</option>
                        <option value="OTROS">OTROS (Escribir manual)</option>
                      </select>

                      {/* Input manual explícito para unidades */}
                      {(!['KG', 'PIEZA', 'PAQUETE', 'LITRO', 'CAJA'].includes(formData.unidad) && formData.unidad !== undefined) && (
                        <input 
                          type="text"
                          name="unidad"
                          value={formData.unidad}
                          onChange={handleInputChange}
                          placeholder="Escribe la unidad..."
                          className={styles.input}
                          style={{ marginTop: '10px' }}
                          required
                        />
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label>Estado del Producto *</label>
                      <input 
                        type="text"
                        name="estado"
                        value={formData.estado}
                        onChange={handleInputChange}
                        placeholder="Seleccionar o escribir..."
                        list="estados-list"
                        className={styles.inputWithList}
                        required
                      />
                      <datalist id="estados-list">
                        <option value="Fresco" />
                        <option value="Congelado" />
                        <option value="Marinado" />
                        <option value="Cocido" />
                      </datalist>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Descripción</label>
                      <input 
                        type="text" 
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleInputChange}
                        placeholder="Descripción corta del producto" 
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h4>💰 Precios</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Precio de Compra *</label>
                      <CurrencyInput 
                        name="precioCompra"
                        value={formData.precioCompra}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Precio de Venta *</label>
                      <CurrencyInput 
                        name="precioVenta"
                        value={formData.precioVenta}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  {formData.precioCompra && formData.precioVenta && (
                    <div className={styles.margenPreview}>
                      <span>Margen de ganancia:</span>
                      <span className={styles.margenValue}>
                        +{calcularMargen(parseFloat(formData.precioCompra), parseFloat(formData.precioVenta))}%
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.formSection}>
                  <h4>📊 Inventario</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Stock Inicial</label>
                      <input 
                        type="number" 
                        name="stock"
                        value={formData.stock}
                        onChange={handleInputChange}
                        placeholder="0" 
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Stock Mínimo (para alertas)</label>
                      <input 
                        type="number" 
                        name="stockMinimo"
                        value={formData.stockMinimo}
                        onChange={handleInputChange}
                        placeholder="10" 
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={guardando}
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar/Restar Stock */}
      {mostrarModalStock && productoStock && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalStock(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2>📥 Ajustar Stock</h2>
              <button className={styles.closeButton} onClick={() => setMostrarModalStock(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '3rem' }}>{getCategoriaIcon(productoStock.categoria)}</span>
                <h3 style={{ margin: '10px 0' }}>{productoStock.nombre}</h3>
                <p style={{ color: '#666' }}>Stock actual: <strong>{productoStock.stock} {productoStock.unidad}</strong></p>
              </div>
              
              <div className={styles.formGroup}>
                <label>Cantidad a ajustar</label>
                <input 
                  type="number" 
                  value={cantidadStock}
                  onChange={(e) => setCantidadStock(e.target.value)}
                  placeholder="Ingresa la cantidad"
                  style={{ textAlign: 'center', fontSize: '1.2rem' }}
                />
              </div>

              {/* Sección de Compra (Solo visible al agregar) */}
              <div style={{ marginTop: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input 
                    type="checkbox" 
                    id="esCompra"
                    checked={esCompra} 
                    onChange={(e) => setEsCompra(e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <label htmlFor="esCompra" style={{ fontWeight: '600', cursor: 'pointer' }}>¿Es una Compra a Proveedor?</label>
                </div>

                {esCompra && (
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Proveedor *</label>
                      <select 
                        value={proveedorId}
                        onChange={(e) => setProveedorId(e.target.value)}
                        className={styles.selectInput}
                      >
                        <option value="">Seleccionar...</option>
                        {proveedores.filter(p => p.estado === 'activo').map(prov => (
                          <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                       <label>Precio Compra ($)</label>
                       <CurrencyInput 
                         value={precioCompra}
                         onChange={(e) => setPrecioCompra(e.target.value)}
                         placeholder="0.00"
                       />
                    </div>
                    <div className={styles.formGroup}>
                       <label>Nuevo Precio Venta ($)</label>
                       <CurrencyInput 
                         value={nuevoPrecioVenta}
                         onChange={(e) => setNuevoPrecioVenta(e.target.value)}
                         placeholder="0.00"
                       />
                    </div>
                  </div>
                )}
              </div>

            </div>
            <div className={styles.modalFooter} style={{ justifyContent: 'center', gap: '12px' }}>
              {!esCompra && (
                <button 
                  className={styles.btnDanger}
                  onClick={() => agregarStock('restar')}
                  disabled={!cantidadStock}
                >
                  ➖ Restar / Ajuste
                </button>
              )}
              <button 
                className={styles.btnPrimary}
                onClick={() => agregarStock('agregar')}
                disabled={!cantidadStock || (esCompra && !proveedorId)}
              >
                {esCompra ? '🛒 Registrar Compra' : '➕ Agregar / Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {mostrarModalEliminar && productoAEliminar && (
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
                <p><strong>¿Estás seguro de eliminar este producto?</strong></p>
                <p className={styles.advertenciaTexto}>
                  Esta acción eliminará permanentemente:<br/>
                  • Producto: <strong>{productoAEliminar.nombre}</strong><br/>
                  • Categoría: {productoAEliminar.categoria}<br/>
                  • Stock actual: {productoAEliminar.stock} {productoAEliminar.unidad}
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
    </main>
    </>
  );
}
