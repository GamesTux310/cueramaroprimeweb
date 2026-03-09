'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './clientes.module.css';
import { getClientes, addCliente, updateCliente, saveClientes, getFacturas, deleteClienteCascade, getVentas, getAbonos } from '@/lib/storage';
import { uploadImage } from '@/lib/storageService';
import ImageModal from '@/components/ImageModal';
import ActivityCalendar from '@/components/ActivityCalendar';

export default function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [facturas, setFacturas] = useState([]); 
    const [ventasData, setVentasData] = useState([]);
    const [abonosData, setAbonosData] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [subiendoImagenes, setSubiendoImagenes] = useState({
        avatar: false,
        credencial: false,
        comprobante: false,
        otros: false
    });
    const [modoEdicion, setModoEdicion] = useState(false);
    const [clienteEditando, setClienteEditando] = useState(null);
    
    // Estados para eliminación segura
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [confirmarTexto, setConfirmarTexto] = useState('');
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [modalImagen, setModalImagen] = useState({ show: false, url: '' });
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [detalleVenta, setDetalleVenta] = useState(null);
    
    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    // Estado del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        direccionEntrega: '', // 🆕 Dirección de entrega
        ciudad: 'CUERÁMARO, GUANAJUATO', // Default explícito
        tipoCliente: 'contado',
        diasCredito: 0,
        credencialURL: null, // imagen de credencial
        comprobanteURL: null, // imagen de comprobante domicilio
        otrosDocURL: null, // otros documentos
        avatarURL: null, // 🆕 Avatar del cliente
    });

    // Cargar clientes al montar el componente y escuchar cambios
    useEffect(() => {
        const cargarClientes = async () => {
            const clientesCargados = await getClientes();
            setClientes(clientesCargados);
            setFacturas(await getFacturas());
            setVentasData(await getVentas());
            setAbonosData(await getAbonos());
        };

        cargarClientes();

        // Escuchar eventos de sincronización en tiempo real
        window.addEventListener('cueramaro_data_updated', cargarClientes);
        
        return () => {
            window.removeEventListener('cueramaro_data_updated', cargarClientes);
        };
    }, []);

    // Filtrar clientes
    const clientesFiltrados = clientes.filter(cliente => {
        const coincideBusqueda = (cliente.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (cliente.telefono || '').includes(busqueda) ||
            (cliente.email && cliente.email.toLowerCase().includes(busqueda.toLowerCase()));
        const coincideTipo = filtroTipo === 'todos' || cliente.tipoCliente === filtroTipo;
        const coincideEstado = filtroEstado === 'todos' || cliente.estado === filtroEstado;
        return coincideBusqueda && coincideTipo && coincideEstado;
    });

    // Estadísticas
    const totalClientes = clientes.length;
    const clientesActivos = clientes.filter(c => c.estado === 'activo').length;
    const clientesCredito = clientes.filter(c => c.tipoCliente === 'credito').length;
    const totalPendiente = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);

    const verExpediente = (cliente) => {
        setClienteSeleccionado(cliente);
        setMostrarModal(true);
    };

    const formatearMoneda = (cantidad) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(cantidad);
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


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);

        // Validar campos requeridos
        if (!formData.nombre || !formData.telefono || !formData.direccion) {
            alert('Por favor llena todos los campos requeridos');
            setGuardando(false);
            return;
        }

        try {
            if (modoEdicion && clienteEditando) {
                // Actualizar cliente existente usando la función del storage
                const clienteActualizado = {
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    email: formData.email || '',
                    direccion: formData.direccion,
                    direccionEntrega: formData.direccionEntrega || '', // 🆕
                    ciudad: formData.ciudad || 'CUERÁMARO, GUANAJUATO', // Ciudad para pagaré
                    cp: formData.cp || '', // Added CP
                    rfc: formData.rfc || '', // Added RFC
                    tipoCliente: formData.tipoCliente,
                    diasCredito: formData.tipoCliente === 'credito' ? (parseInt(formData.diasCredito) || 0) : 0,
                    credencialURL: formData.credencialURL,
                    comprobanteURL: formData.comprobanteURL,
                    otrosDocURL: formData.otrosDocURL,
                    avatarURL: formData.avatarURL,
                };
                
                // Usar updateCliente del storage para guardar correctamente
                const resultado = await updateCliente(clienteEditando.id, clienteActualizado);
                
                if (!resultado) {
                    throw new Error(`No se pudo actualizar el cliente (ID: ${clienteEditando.id} no encontrado).`);
                }

                setClientes(await getClientes());
                showToast(`Cliente "${formData.nombre}" actualizado exitosamente`, 'success');
            } else {
                // Agregar nuevo cliente
                const nuevoCliente = await addCliente({
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    email: formData.email || '',
                    direccion: formData.direccion,
                    direccionEntrega: formData.direccionEntrega || '', // 🆕
                    // direccion duplicada eliminada
                    ciudad: formData.ciudad || 'CUERÁMARO, GUANAJUATO', // Ciudad para pagaré
                    cp: formData.cp || '', // Added CP
                    rfc: formData.rfc || '', // Added RFC
                    tipoCliente: formData.tipoCliente,
                    diasCredito: formData.tipoCliente === 'credito' ? (parseInt(formData.diasCredito) || 0) : 0,
                    estado: 'activo',
                    credencialURL: formData.credencialURL,
                    comprobanteURL: formData.comprobanteURL,
                    otrosDocURL: formData.otrosDocURL,
                    avatarURL: formData.avatarURL,
                });
                
                setClientes(await getClientes());
                showToast(`Cliente "${nuevoCliente.nombre}" guardado exitosamente`, 'success');
            }

            // Limpiar formulario y cerrar modal
            setFormData({
            nombre: '',
            telefono: '',
            email: '',
            direccion: '',
            direccionEntrega: '',
            ciudad: 'CUERÁMARO, GUANAJUATO',
                cp: '',
                rfc: '',
                tipoCliente: 'contado',
                diasCredito: 0,
                credencialURL: null,
                comprobanteURL: null,
                otrosDocURL: null,
                avatarURL: null,
            });
            setMostrarFormulario(false);
            setModoEdicion(false);
            setClienteEditando(null);
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                alert('⚠️ Error: No hay suficiente espacio para guardar las imágenes. Intenta usar imágenes más pequeñas o elimina datos antiguos.');
            } else {
                alert('Ocurrió un error al guardar el cliente: ' + error.message);
            }
        } finally {
            setGuardando(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Funciones para manejar subida de documentos
    const handleDocumentoChange = (e, tipo) => {
        const file = e.target.files[0];
        if (file) {
            procesarDocumento(file, tipo);
        }
    };

    const procesarDocumento = async (file, tipo) => {
        console.log(`[ClientesPage] 📄 Procesando documento LOCAL: ${tipo}, Archivo: ${file?.name}`);
        
        if (!file.type.startsWith('image/')) {
            showToast('Solo se permiten imágenes para modo offline', 'warning');
            return;
        }

        try {
            setSubiendoImagenes(prev => ({ ...prev, [tipo]: true }));
            
            // Usar helper para comprimir y obtener Base64 (Offline First)
            const { compressImageToBase64 } = await import('@/lib/imageHelper');
            const base64 = await compressImageToBase64(file);
            
            console.log(`[ClientesPage] ✅ Imagen procesada localmente (${base64.length} chars)`);

            if (tipo === 'credencial') {
                setFormData(prev => ({ ...prev, credencialURL: base64 }));
            } else if (tipo === 'comprobante') {
                setFormData(prev => ({ ...prev, comprobanteURL: base64 }));
            } else if (tipo === 'otros') {
                setFormData(prev => ({ ...prev, otrosDocURL: base64 }));
            } else if (tipo === 'avatar') {
                setFormData(prev => ({ ...prev, avatarURL: base64 }));
            }
            
            showToast('Imagen lista para guardar (Se subirá al sincronizar)', 'success');
        } catch (error) {
            console.error('[ClientesPage] ❌ Error procesando imagen local:', error);
            showToast('Error al procesar imagen', 'error');
        } finally {
            setSubiendoImagenes(prev => ({ ...prev, [tipo]: false }));
        }
    };

    const eliminarDocumento = (tipo) => {
        if (tipo === 'credencial') {
            setFormData({ ...formData, credencialURL: null });
        } else if (tipo === 'comprobante') {
            setFormData({ ...formData, comprobanteURL: null });
        } else if (tipo === 'otros') {
            setFormData({ ...formData, otrosDocURL: null });
        } else if (tipo === 'avatar') {
            setFormData({ ...formData, avatarURL: null });
        }
    };

    // Funciones para drag & drop
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.background = '#eff6ff';
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#d1d5db';
        e.currentTarget.style.background = 'transparent';
    };

    const handleDrop = (e, tipo) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#d1d5db';
        e.currentTarget.style.background = 'transparent';
        const file = e.dataTransfer.files[0];
        if (file) {
            procesarDocumento(file, tipo);
        }
    };

    const iniciarEliminacion = (cliente) => {
        setClienteAEliminar(cliente);
        setConfirmarTexto('');
        setMostrarModalEliminar(true);
    };

    const iniciarEdicion = (cliente) => {
        // Llenar el formulario con los datos del cliente
        setFormData({
            nombre: cliente.nombre || '',
            telefono: cliente.telefono || '',
            email: cliente.email || '',
            direccion: cliente.direccion || '',
            direccionEntrega: cliente.direccionEntrega || '',
            ciudad: cliente.ciudad || 'CUERÁMARO, GUANAJUATO', 
            cp: cliente.cp || '', // Added CP
            rfc: cliente.rfc || '', // Added RFC
            tipoCliente: cliente.tipoCliente || 'contado',
            diasCredito: cliente.diasCredito || 0,
            credencialURL: cliente.credencialURL || null,
            comprobanteURL: cliente.comprobanteURL || null,
            otrosDocURL: cliente.otrosDocURL || null,
            avatarURL: cliente.avatarURL || null,
        });
        setClienteEditando(cliente);
        setModoEdicion(true);
        setMostrarModal(false); // Cerrar modal de expediente
        setMostrarFormulario(true); // Abrir formulario
    };

    const confirmarEliminacion = async () => {
        if (confirmarTexto.toLowerCase() === 'eliminar' && clienteAEliminar) {
            try {
                const resultado = await deleteClienteCascade(clienteAEliminar.id);
                setClientes(await getClientes());
                setMostrarModalEliminar(false);
                setMostrarModal(false);
                setClienteAEliminar(null);
                setConfirmarTexto('');
                showToast(`Cliente "${clienteAEliminar.nombre}" y ${resultado.total - 1} registros vinculados eliminados`, 'success');
            } catch (err) {
                showToast(`Error al eliminar: ${err.message}`, 'error');
            }
        }
    };

    const cancelarEliminacion = () => {
        setMostrarModalEliminar(false);
        setClienteAEliminar(null);
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
            
            {/* Modal de Imagen Ampliada */}
            {modalImagen.show && (
                <ImageModal
                imageUrl={modalImagen.url}
                onClose={() => setModalImagen({ show: false, url: '' })}
                />
            )}

            {/* Modal Detalle Venta */}
            {detalleVenta && (
                <div className={styles.modalOverlay} onClick={() => setDetalleVenta(null)}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                    <h3>🛒 Detalle de la Venta</h3>
                    <button className={styles.closeButton} onClick={() => setDetalleVenta(null)}>×</button>
                    </div>
                    <div className={styles.modalBody}>
                    <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Venta #:</span>
                        <span>{detalleVenta.id}</span>
                    </div>
                    <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Fecha:</span>
                        <span>{parsearFecha(detalleVenta.fecha).toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Factura:</span>
                        {facturas.find(f => f.ventaId === detalleVenta.id) ? (
                            <Link href="/facturas" className={styles.linkFactura} style={{color: '#3b82f6', textDecoration: 'underline'}}>
                                {facturas.find(f => f.ventaId === detalleVenta.id).numeroFactura} ({facturas.find(f => f.ventaId === detalleVenta.id).estado}) 🔗
                            </Link>
                        ) : (
                            <span style={{color: '#9ca3af'}}>Sin factura</span>
                        )}
                    </div>
                    <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Cliente:</span>
                        <span>{detalleVenta.clienteNombre || detalleVenta.cliente?.nombre || 'Cliente General'}</span>
                    </div>
                    <div className={styles.detalleRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Método de Pago:</span>
                        <span style={{ textTransform: 'capitalize' }}>{detalleVenta.metodoPago || 'Contado'}</span>
                    </div>
                    
                    {/* Productos */}
                    <div className={styles.detalleProductos} style={{ marginTop: '15px' }}>
                        <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Productos:</span>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Prod.</th>
                            <th style={{ padding: '8px' }}>Cant.</th>
                            <th style={{ padding: '8px' }}>Precio</th>
                            <th style={{ padding: '8px' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detalleVenta.productos?.map((prod, idx) => {
                            const precio = Number(prod.precioUnitario || prod.precio || 0);
                            const total = Number(prod.subtotal || (prod.cantidad * precio) || 0);
                            return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <td style={{ padding: '8px' }}>{prod.nombre}</td>
                                <td style={{ padding: '8px' }}>{prod.cantidad} {prod.unidad}</td>
                                <td style={{ padding: '8px' }}>{formatearMoneda(precio)}</td>
                                <td style={{ padding: '8px' }}>{formatearMoneda(total)}</td>
                                </tr>
                            );
                            })}
                        </tbody>
                        </table>
                    </div>
                    
                    <div className={styles.detalleRow} style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>Total:</span>
                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px' }}>
                        {formatearMoneda(detalleVenta.total)}
                        </span>
                    </div>
                    </div>
                </div>
                </div>
            )}

            {/* Modal de Calendario de Actividad */}
            {mostrarCalendario && (
                <ActivityCalendar
                    type="ventas"
                    clienteId={clienteSeleccionado?.id}
                    onClose={() => setMostrarCalendario(false)}
                    onActivityClick={(venta) => setDetalleVenta(venta)}
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
                            <span className={styles.headerIcon}>👥</span>
                            <div>
                                <h1>Clientes</h1>
                                <p>Base de datos de clientes</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className={styles.addButton}
                            onClick={() => setMostrarCalendario(true)}
                            style={{ background: '#3b82f6', color: 'white' }}
                        >
                            <span>📅</span> Calendario
                        </button>
                        <button
                            className={styles.addButton}
                            onClick={() => setMostrarFormulario(true)}
                        >
                            <span>➕</span> Nuevo Cliente
                        </button>
                    </div>
                </div>
            </header>

            {/* Estadísticas */}
            <section className={styles.statsSection}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#dbeafe', color: '#3b82f6' }}>👥</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{totalClientes}</span>
                        <span className={styles.statLabel}>Total Clientes</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#d1fae5', color: '#10b981' }}>✅</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{clientesActivos}</span>
                        <span className={styles.statLabel}>Activos</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>💳</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{clientesCredito}</span>
                        <span className={styles.statLabel}>Con Crédito</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fee2e2', color: '#ef4444' }}>💰</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{formatearMoneda(totalPendiente)}</span>
                        <span className={styles.statLabel}>Por Cobrar</span>
                    </div>
                </div>
            </section>

            {/* Filtros y Búsqueda */}
            <section className={styles.filtersSection}>
                <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o email..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.filters}>
                    <select
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="todos">Todos los tipos</option>
                        <option value="contado">Contado</option>
                        <option value="credito">Crédito</option>
                    </select>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="activo">Activos</option>
                        <option value="atrasado">Atrasados</option>
                        <option value="inactivo">Inactivos</option>
                    </select>
                </div>
            </section>

            {/* Tabla de Clientes */}
            <section className={styles.tableSection}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Contacto</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Saldo Pendiente</th>
                                <th>Última Compra</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientesFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        {clientes.length === 0 
                                            ? '📭 No hay clientes registrados. ¡Agrega el primero!' 
                                            : '🔍 No se encontraron clientes con esos filtros'}
                                    </td>
                                </tr>
                            ) : (
                                clientesFiltrados.map((cliente) => (
                                    <tr key={cliente.id}>
                                        <td>
                                            <div className={styles.clienteInfo}>
                                                <div className={styles.clienteAvatar}
                                                     onClick={() => cliente.avatarURL && setModalImagen({ show: true, url: cliente.avatarURL })}
                                                     style={{ cursor: cliente.avatarURL ? 'pointer' : 'default' }}
                                                >
                                                    {cliente.avatarURL ? (
                                                        <img src={cliente.avatarURL} alt={cliente.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                                    ) : (
                                                        cliente.nombre.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <span className={styles.clienteNombre}>{cliente.nombre}</span>
                                                    <span className={styles.clienteDireccion}>{cliente.direccion}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.contactoInfo}>
                                                <span>📞 {cliente.telefono}</span>
                                                <span>✉️ {cliente.email || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[cliente.tipoCliente]}`}>
                                                {cliente.tipoCliente === 'credito' ? '💳 Crédito' : '💵 Contado'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[cliente.estado]}`}>
                                                {cliente.estado === 'activo' && '🟢 Activo'}
                                                {cliente.estado === 'atrasado' && '🔴 Atrasado'}
                                                {cliente.estado === 'inactivo' && '⚪ Inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={cliente.saldoPendiente > 0 ? styles.saldoPendiente : styles.saldoCero}>
                                                {formatearMoneda(cliente.saldoPendiente || 0)}
                                            </span>
                                        </td>
                                        <td>{cliente.ultimaCompra || 'Sin compras'}</td>
                                        <td>
                                            <div className={styles.acciones}>
                                                <button
                                                    className={styles.btnActionWithText}
                                                    onClick={() => verExpediente(cliente)}
                                                    title="Ver expediente"
                                                >
                                                    📋 Expediente
                                                </button>
                                                <button 
                                                    className={`${styles.btnActionWithText} ${styles.btnDeleteWithText}`} 
                                                    title="Eliminar"
                                                    onClick={() => iniciarEliminacion(cliente)}
                                                >
                                                    🗑️ Eliminar
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

            {/* Modal de Expediente */}
            {mostrarModal && clienteSeleccionado && (
                <div className={styles.modalOverlay} onClick={() => setMostrarModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>📋 Expediente del Cliente</h2>
                            <button className={styles.closeButton} onClick={() => setMostrarModal(false)}>
                                ✕
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.expedienteHeader}>
                                <div className={styles.avatarLarge}
                                     onClick={() => clienteSeleccionado.avatarURL && setModalImagen({ show: true, url: clienteSeleccionado.avatarURL })}
                                     style={{ cursor: clienteSeleccionado.avatarURL ? 'pointer' : 'default', overflow: 'hidden' }}
                                >
                                    {clienteSeleccionado.avatarURL ? (
                                        <img src={clienteSeleccionado.avatarURL} alt={clienteSeleccionado.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        clienteSeleccionado.nombre.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h3>{clienteSeleccionado.nombre}</h3>
                                    <p>Cliente desde {clienteSeleccionado.fechaRegistro || '2024'}</p>
                                </div>
                            </div>

                            <div className={styles.expedienteSections}>
                                <div className={styles.expedienteSection}>
                                    <h4>📱 Información de Contacto</h4>
                                    <div className={styles.infoGrid}>
                                        <div>
                                            <label>Teléfono</label>
                                            <p>{clienteSeleccionado.telefono}</p>
                                        </div>
                                        <div>
                                            <label>Email</label>
                                            <p>{clienteSeleccionado.email || 'No registrado'}</p>
                                        </div>
                                        <div>
                                            <label>Dirección Fiscal</label>
                                            <p>
                                                {clienteSeleccionado.direccion}
                                                {clienteSeleccionado.ciudad && <span style={{display:'block', fontSize:'0.9em', color:'#666'}}>{clienteSeleccionado.ciudad} {clienteSeleccionado.cp ? `CP: ${clienteSeleccionado.cp}` : ''}</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <label>Dirección de Entrega</label>
                                            <p>{clienteSeleccionado.direccionEntrega || 'Misma que fiscal'}</p>
                                        </div>
                                        {clienteSeleccionado.rfc && (
                                            <div>
                                                <label>RFC / CURP</label>
                                                <p>{clienteSeleccionado.rfc}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.expedienteSection}>
                                    <h4>💰 Información Financiera</h4>
                                    <div className={styles.infoGrid}>
                                        <div>
                                            <label>Tipo de Cliente</label>
                                            <p>
                                                {clienteSeleccionado.tipoCliente === 'credito' ? '💳 Crédito' : '💵 Contado'}
                                                {clienteSeleccionado.tipoCliente === 'credito' && clienteSeleccionado.diasCredito > 0 && 
                                                    <span style={{ fontSize: '0.85rem', color: '#059669', marginLeft: '8px', fontWeight: 'bold' }}>
                                                        ({clienteSeleccionado.diasCredito} días)
                                                    </span>
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <label>Saldo Pendiente</label>
                                            <p className={clienteSeleccionado.saldoPendiente > 0 ? styles.saldoPendiente : ''}>
                                                {formatearMoneda(clienteSeleccionado.saldoPendiente || 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <label>Última Compra</label>
                                            <p>{clienteSeleccionado.ultimaCompra || 'Sin compras'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.expedienteSection}>
                                    <h4>📄 Documentos</h4>
                                    <div className={styles.documentos}>
                                        <div className={styles.documento}>
                                            <div className={styles.documentoIcon}>🪪</div>
                                            <div className={styles.documentoInfo}>
                                                <span>Credencial (INE)</span>
                                                {clienteSeleccionado.credencialURL ? (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <img 
                                                            src={clienteSeleccionado.credencialURL} 
                                                            alt="Credencial" 
                                                            style={{ 
                                                                maxWidth: '100px', 
                                                                maxHeight: '60px', 
                                                                borderRadius: '4px',
                                                                border: '1px solid #ddd',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setModalImagen({ show: true, url: clienteSeleccionado.credencialURL })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Sin documento</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.documento}>
                                            <div className={styles.documentoIcon}>🏠</div>
                                            <div className={styles.documentoInfo}>
                                                <span>Comprobante de Domicilio</span>
                                                {clienteSeleccionado.comprobanteURL ? (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <img 
                                                            src={clienteSeleccionado.comprobanteURL} 
                                                            alt="Comprobante" 
                                                            style={{ 
                                                                maxWidth: '100px', 
                                                                maxHeight: '60px', 
                                                                borderRadius: '4px',
                                                                border: '1px solid #ddd',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setModalImagen({ show: true, url: clienteSeleccionado.comprobanteURL })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Sin documento</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.documento}>
                                            <div className={styles.documentoIcon}>📋</div>
                                            <div className={styles.documentoInfo}>
                                                <span>Otros</span>
                                                {clienteSeleccionado.otrosDocURL ? (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <img 
                                                            src={clienteSeleccionado.otrosDocURL} 
                                                            alt="Otros" 
                                                            style={{ 
                                                                maxWidth: '100px', 
                                                                maxHeight: '60px', 
                                                                borderRadius: '4px',
                                                                border: '1px solid #ddd',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setModalImagen({ show: true, url: clienteSeleccionado.otrosDocURL })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Sin documento</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 🆕 Últimos Movimientos (Ventas y Abonos) */}
                                <div className={styles.expedienteSection} style={{ gridColumn: '1 / -1' }}>
                                    <h4>📊 Últimos Movimientos</h4>
                                    <div style={{
                                        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', 
                                        padding: '12px', maxHeight: '300px', overflowY: 'auto', marginTop: '8px'
                                    }}>
                                        {(() => {
                                            // Encontrar facturas del cliente
                                            const facturasCliente = facturas.filter(f => f.clienteId === clienteSeleccionado.id);
                                            const idFacturas = facturasCliente.map(f => f.id);
                                            
                                            // Extraer ventas
                                            const ventasCliente = ventasData.filter(v => v.clienteId === clienteSeleccionado.id)
                                                .map(v => ({
                                                    tipo: 'VENTA',
                                                    fecha: v.fecha,
                                                    monto: v.total,
                                                    metodo: v.metodoPago,
                                                    id: v.id,
                                                    descripcion: `Compra - ${v.productos?.length || 0} prod(s)`
                                                }));
                                                
                                            // Extraer abonos a facturas de este cliente
                                            const abonosCliente = abonosData.filter(a => idFacturas.includes(a.facturaId))
                                                .map(a => ({
                                                    tipo: 'ABONO',
                                                    fecha: a.fecha,
                                                    monto: a.monto,
                                                    metodo: a.metodoPago,
                                                    id: a.id,
                                                    descripcion: `Abono a F-${new Date(facturasCliente.find(f=>f.id===a.facturaId)?.fecha || a.fecha).getFullYear()}`
                                                }));
                                                
                                            const movimientos = [...ventasCliente, ...abonosCliente].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
                                            
                                            if (movimientos.length === 0) {
                                                return <div style={{ textAlign:'center', color:'#6b7280', padding: '20px' }}>📭 Sin movimientos recientes</div>;
                                            }
                                            
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {movimientos.map(mov => (
                                                        <div key={`${mov.tipo}-${mov.id}`} style={{
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            background: 'white', padding: '10px 14px', borderRadius: '6px',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: `4px solid ${mov.tipo === 'VENTA' ? '#3b82f6' : '#10b981'}`
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <span style={{ fontSize: '1.2rem' }}>{mov.tipo === 'VENTA' ? '🛒' : '💰'}</span>
                                                                <div>
                                                                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9rem' }}>{mov.descripcion}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                                                        {parsearFecha(mov.fecha).toLocaleDateString('es-MX')} • {mov.metodo}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                fontWeight: 'bold', fontSize: '0.95rem',
                                                                color: mov.tipo === 'VENTA' ? '#1f2937' : '#059669'
                                                            }}>
                                                                {mov.tipo === 'VENTA' ? '-' : '+'}{formatearMoneda(mov.monto)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.btnDanger}
                                onClick={() => iniciarEliminacion(clienteSeleccionado)}
                            >
                                🗑️ Eliminar
                            </button>
                            <button className={styles.btnSecondary} onClick={() => setMostrarModal(false)}>
                                Cerrar
                            </button>
                            <button 
                                className={styles.btnPrimary}
                                onClick={() => iniciarEdicion(clienteSeleccionado)}
                            >
                                ✏️ Editar Cliente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Nuevo/Editar Cliente */}
            {mostrarFormulario && (
                <div className={styles.modalOverlay} onClick={() => { setMostrarFormulario(false); setModoEdicion(false); setClienteEditando(null); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{modoEdicion ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h2>
                            <button className={styles.closeButton} onClick={() => { setMostrarFormulario(false); setModoEdicion(false); setClienteEditando(null); }}>
                                ✕
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <form className={styles.form} onSubmit={handleSubmit}>
                                <div className={styles.formSection}>
                                    <h4>👤 Información Personal</h4>
                                    <div className={styles.formGroup} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ marginBottom: '10px' }}>Foto de Perfil / Avatar</label>
                                        <div className={styles.comprobanteUpload} style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', position: 'relative' }}>
                                            <label 
                                                className={styles.uploadLabel} 
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, 'avatar')}
                                                style={{ borderRadius: '50%', width: '100%', height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleDocumentoChange(e, 'avatar')}
                                                    style={{ display: 'none' }}
                                                />
                                                {formData.avatarURL ? (
                                                    <img src={formData.avatarURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                                                        <span style={{ fontSize: '24px' }}>📷</span>
                                                        <span style={{ fontSize: '10px' }}>Subir Foto</span>
                                                    </div>
                                                )}
                                            </label>
                                            {subiendoImagenes.avatar && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                                    <span style={{ fontSize: '10px' }}>⏳ Subiendo...</span>
                                                </div>
                                            )}
                                        </div>
                                        {formData.avatarURL && (
                                            <button 
                                                type="button" 
                                                onClick={() => eliminarDocumento('avatar')}
                                                style={{ marginTop: '8px', color: '#ef4444', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer' }}
                                            >
                                                ✕ Quitar foto
                                            </button>
                                        )}
                                    </div>

                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label>Nombre Completo *</label>
                                            <input 
                                                type="text" 
                                                name="nombre"
                                                value={formData.nombre}
                                                onChange={handleInputChange}
                                                placeholder="Ej: Juan Pérez García" 
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
                                                placeholder="Ej: 462-123-4567" 
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
                                                placeholder="Ej: correo@email.com" 
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Dirección *</label>
                                            <input 
                                                type="text" 
                                                name="direccion"
                                                value={formData.direccion}
                                                onChange={handleInputChange}
                                                placeholder="Calle, número, colonia" 
                                                required 
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Dirección de Entrega</label>
                                            <input 
                                                type="text" 
                                                name="direccionEntrega"
                                                value={formData.direccionEntrega}
                                                onChange={handleInputChange}
                                                placeholder="Dirección para entregar pedidos" 
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Ciudad</label>
                                            <input 
                                                type="text" 
                                                name="ciudad"
                                                value={formData.ciudad}
                                                onChange={handleInputChange}
                                                placeholder="Ej: León" 
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Código Postal</label>
                                            <input 
                                                type="text" 
                                                name="cp"
                                                value={formData.cp}
                                                onChange={handleInputChange}
                                                placeholder="Ej: 36960" 
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>RFC / CURP</label>
                                            <input 
                                                type="text" 
                                                name="rfc"
                                                value={formData.rfc}
                                                onChange={handleInputChange}
                                                placeholder="RFC o CURP del cliente" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formSection}>
                                    <h4>💳 Tipo de Cliente</h4>
                                    <div className={styles.radioGroup}>
                                        <label className={styles.radioLabel}>
                                            <input 
                                                type="radio" 
                                                name="tipoCliente" 
                                                value="contado"
                                                checked={formData.tipoCliente === 'contado'}
                                                onChange={handleInputChange}
                                            />
                                            <span className={styles.radioCustom}></span>
                                            💵 Contado
                                        </label>
                                        <label className={styles.radioLabel}>
                                            <input 
                                                type="radio" 
                                                name="tipoCliente" 
                                                value="credito"
                                                checked={formData.tipoCliente === 'credito'}
                                                onChange={handleInputChange}
                                            />
                                            <span className={styles.radioCustom}></span>
                                            💳 Crédito
                                        </label>
                                    </div>
                                    
                                    {/* Campo condicional para Días de Crédito ELIMINADO por solicitud del cliente */}
                                    {/* Se decide en el momento de la venta */}
                                </div>

                                <div className={styles.formSection}>
                                    <h4>📄 Documentos (Opcional)</h4>
                                    <div className={styles.uploadGrid}>
                                        {/* Credencial (INE) */}
                                        <label 
                                            className={styles.uploadBox}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'credencial')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <input 
                                                type="file" 
                                                accept="image/*,.pdf" 
                                                onChange={(e) => handleDocumentoChange(e, 'credencial')}
                                                style={{ display: 'none' }}
                                            />
                                            <span>🪪</span>
                                            <p>Credencial (INE)</p>
                                            {formData.credencialURL ? (
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <img 
                                                        src={formData.credencialURL} 
                                                        alt="Credencial" 
                                                        style={{ 
                                                            maxWidth: '100%', 
                                                            maxHeight: '80px', 
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd'
                                                        }} 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); eliminarDocumento('credencial'); }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-6px',
                                                            right: '-6px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            cursor: 'pointer',
                                                            fontSize: '10px'
                                                        }}
                                                    >✕</button>
                                                </div>
                                            ) : (
                                                <small style={{ color: '#9ca3af', marginBottom: '8px' }}>
                                                    Toca para seleccionar
                                                </small>
                                            )}
                                            {subiendoImagenes.credencial && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                                                    <span style={{ fontSize: '12px' }}>⏳ Subiendo...</span>
                                                </div>
                                            )}
                                        </label>
                                        
                                        {/* Comprobante de Domicilio */}
                                        <label 
                                            className={styles.uploadBox}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'comprobante')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <input 
                                                type="file" 
                                                accept="image/*,.pdf" 
                                                onChange={(e) => handleDocumentoChange(e, 'comprobante')}
                                                style={{ display: 'none' }}
                                            />
                                            <span>🏠</span>
                                            <p>Comprobante de Domicilio</p>
                                            {formData.comprobanteURL ? (
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <img 
                                                        src={formData.comprobanteURL} 
                                                        alt="Comprobante" 
                                                        style={{ 
                                                            maxWidth: '100%', 
                                                            maxHeight: '80px', 
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd'
                                                        }} 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); eliminarDocumento('comprobante'); }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-6px',
                                                            right: '-6px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            cursor: 'pointer',
                                                            fontSize: '10px'
                                                        }}
                                                    >✕</button>
                                                </div>
                                            ) : (
                                                <small style={{ color: '#9ca3af', marginBottom: '8px' }}>
                                                    Toca para seleccionar
                                                </small>
                                            )}
                                            {subiendoImagenes.comprobante && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                                                    <span style={{ fontSize: '12px' }}>⏳ Subiendo...</span>
                                                </div>
                                            )}
                                        </label>
                                        
                                        {/* Otros Documentos */}
                                        <label 
                                            className={styles.uploadBox}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'otros')}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <input 
                                                type="file" 
                                                accept="image/*,.pdf" 
                                                onChange={(e) => handleDocumentoChange(e, 'otros')}
                                                style={{ display: 'none' }}
                                            />
                                            <span>📋</span>
                                            <p>Otros</p>
                                            {formData.otrosDocURL ? (
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <img 
                                                        src={formData.otrosDocURL} 
                                                        alt="Otros" 
                                                        style={{ 
                                                            maxWidth: '100%', 
                                                            maxHeight: '80px', 
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd'
                                                        }} 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); eliminarDocumento('otros'); }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-6px',
                                                            right: '-6px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            cursor: 'pointer',
                                                            fontSize: '10px'
                                                        }}
                                                    >✕</button>
                                                </div>
                                            ) : (
                                                <small style={{ color: '#9ca3af', marginBottom: '8px' }}>
                                                    Toca para seleccionar
                                                </small>
                                            )}
                                            {subiendoImagenes.otros && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                                                    <span style={{ fontSize: '12px' }}>⏳ Subiendo...</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.btnSecondary} 
                                onClick={() => setMostrarFormulario(false)}
                                type="button"
                            >
                                Cancelar
                            </button>
                            <button 
                                className={styles.btnPrimary}
                                onClick={handleSubmit}
                                disabled={guardando || Object.values(subiendoImagenes).some(Boolean)}
                                style={{ opacity: (guardando || Object.values(subiendoImagenes).some(Boolean)) ? 0.7 : 1 }}
                            >
                                {guardando ? '⏳ Guardando...' : Object.values(subiendoImagenes).some(Boolean) ? '⏳ Subiendo archivos...' : '💾 Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {mostrarModalEliminar && clienteAEliminar && (
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
                                <p><strong>¿Estás seguro de eliminar este cliente?</strong></p>
                                <p className={styles.advertenciaTexto}>
                                    Esta acción eliminará permanentemente:<br/>
                                    • Cliente: <strong>{clienteAEliminar.nombre}</strong><br/>
                                    • Teléfono: {clienteAEliminar.telefono}<br/>
                                    {clienteAEliminar.saldoPendiente > 0 && (
                                        <span className={styles.advertenciaSaldo}>
                                            ⚠️ Este cliente tiene un saldo pendiente de {formatearMoneda(clienteAEliminar.saldoPendiente)}
                                        </span>
                                    )}
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
