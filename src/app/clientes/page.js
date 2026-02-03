'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './clientes.module.css';
import { getClientes, addCliente, updateCliente, saveClientes } from '@/lib/storage';
import ImageModal from '@/components/ImageModal';

export default function ClientesPage() {
    const [clientes, setClientes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [clienteEditando, setClienteEditando] = useState(null);
    
    // Estados para eliminación segura
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [confirmarTexto, setConfirmarTexto] = useState('');
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [modalImagen, setModalImagen] = useState({ show: false, url: '' });
    
    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    // Estado del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        tipoCliente: 'contado',
        diasCredito: 0,
        credencialURL: null, // imagen de credencial
        comprobanteURL: null, // imagen de comprobante domicilio
        otrosDocURL: null, // otros documentos
    });

    // Cargar clientes al montar el componente
    useEffect(() => {
        const clientesCargados = getClientes();
        setClientes(clientesCargados);
    }, []);

    // Filtrar clientes
    const clientesFiltrados = clientes.filter(cliente => {
        const coincideBusqueda = cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            cliente.telefono.includes(busqueda) ||
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
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
                    cp: formData.cp || '', // Added CP
                    rfc: formData.rfc || '', // Added RFC
                    tipoCliente: formData.tipoCliente,
                    diasCredito: formData.tipoCliente === 'credito' ? (parseInt(formData.diasCredito) || 0) : 0,
                    credencialURL: formData.credencialURL,
                    comprobanteURL: formData.comprobanteURL,
                    otrosDocURL: formData.otrosDocURL,
                };
                
                // Usar updateCliente del storage para guardar correctamente
                updateCliente(clienteEditando.id, clienteActualizado);
                
                setClientes(getClientes());
                showToast(`Cliente "${formData.nombre}" actualizado exitosamente`, 'success');
            } else {
                // Agregar nuevo cliente
                const nuevoCliente = addCliente({
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    email: formData.email || '',
                    direccion: formData.direccion,
                    cp: formData.cp || '', // Added CP
                    rfc: formData.rfc || '', // Added RFC
                    tipoCliente: formData.tipoCliente,
                    diasCredito: formData.tipoCliente === 'credito' ? (parseInt(formData.diasCredito) || 0) : 0,
                    estado: 'activo',
                    credencialURL: formData.credencialURL,
                    comprobanteURL: formData.comprobanteURL,
                    otrosDocURL: formData.otrosDocURL,
                });
                
                setClientes(getClientes());
                showToast(`Cliente "${nuevoCliente.nombre}" guardado exitosamente`, 'success');
            }

            // Limpiar formulario y cerrar modal
            setFormData({
                nombre: '',
                telefono: '',
                email: '',
                direccion: '',
                cp: '',
                rfc: '',
                tipoCliente: 'contado',
                diasCredito: 0,
                credencialURL: null,
                comprobanteURL: null,
                otrosDocURL: null,
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

    const procesarDocumento = (file, tipo) => {
        if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
            showToast('Solo se permiten imágenes o PDF', 'warning');
            return;
        }
        // Validar tamaño (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('⚠️ Archivo grande (>10MB). Podría fallar al guardar si excede el espacio.', 'warning');
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (tipo === 'credencial') {
                setFormData({ ...formData, credencialURL: e.target.result });
            } else if (tipo === 'comprobante') {
                setFormData({ ...formData, comprobanteURL: e.target.result });
            } else if (tipo === 'otros') {
                setFormData({ ...formData, otrosDocURL: e.target.result });
            }
        };
        reader.readAsDataURL(file);
    };

    const eliminarDocumento = (tipo) => {
        if (tipo === 'credencial') {
            setFormData({ ...formData, credencialURL: null });
        } else if (tipo === 'comprobante') {
            setFormData({ ...formData, comprobanteURL: null });
        } else if (tipo === 'otros') {
            setFormData({ ...formData, otrosDocURL: null });
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
            cp: cliente.cp || '', // Added CP
            rfc: cliente.rfc || '', // Added RFC
            tipoCliente: cliente.tipoCliente || 'contado',
            diasCredito: cliente.diasCredito || 0,
            credencialURL: cliente.credencialURL || null,
            comprobanteURL: cliente.comprobanteURL || null,
            otrosDocURL: cliente.otrosDocURL || null,
        });
        setClienteEditando(cliente);
        setModoEdicion(true);
        setMostrarModal(false); // Cerrar modal de expediente
        setMostrarFormulario(true); // Abrir formulario
    };

    const confirmarEliminacion = () => {
        if (confirmarTexto.toLowerCase() === 'eliminar' && clienteAEliminar) {
            const clientesActualizados = clientes.filter(c => c.id !== clienteAEliminar.id);
            saveClientes(clientesActualizados);
            setClientes(clientesActualizados);
            setMostrarModalEliminar(false);
            setMostrarModal(false);
            setClienteAEliminar(null);
            setConfirmarTexto('');
            showToast(`Cliente "${clienteAEliminar.nombre}" eliminado`, 'success');
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
                    <button
                        className={styles.addButton}
                        onClick={() => setMostrarFormulario(true)}
                    >
                        <span>➕</span> Nuevo Cliente
                    </button>
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
                                                <div className={styles.clienteAvatar}>
                                                    {cliente.nombre.charAt(0)}
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
                                                    className={styles.btnAccion}
                                                    onClick={() => verExpediente(cliente)}
                                                    title="Ver expediente"
                                                >
                                                    📋
                                                </button>
                                                <button 
                                                    className={styles.btnAccion} 
                                                    title="Eliminar"
                                                    onClick={() => iniciarEliminacion(cliente)}
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
                                <div className={styles.avatarLarge}>
                                    {clienteSeleccionado.nombre.charAt(0)}
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
                                            <label>Dirección</label>
                                            <p>{clienteSeleccionado.direccion}</p>
                                        </div>
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
                                    
                                    {/* Campo condicional para Días de Crédito */}
                                    {formData.tipoCliente === 'credito' && (
                                        <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                                            <label>Días de Crédito Otorgados *</label>
                                            <div style={{ position: 'relative', width: '150px' }}>
                                                <input 
                                                    type="number" 
                                                    name="diasCredito"
                                                    value={formData.diasCredito}
                                                    onChange={handleInputChange}
                                                    placeholder="0"
                                                    min="0"
                                                    style={{ paddingRight: '40px' }}
                                                    required
                                                />
                                                <span style={{ position: 'absolute', right: '10px', top: '12px', color: '#6b7280', fontSize: '0.9rem' }}>días</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.formSection}>
                                    <h4>📄 Documentos (Opcional)</h4>
                                    <div className={styles.uploadGrid}>
                                        {/* Credencial (INE) */}
                                        <div 
                                            className={styles.uploadBox}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'credencial')}
                                        >
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
                                                        onClick={() => eliminarDocumento('credencial')}
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
                                                <>
                                                    <small style={{ color: '#9ca3af', marginBottom: '8px' }}>
                                                        Arrastra aquí o selecciona
                                                    </small>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*,.pdf" 
                                                        onChange={(e) => handleDocumentoChange(e, 'credencial')}
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        
                                        {/* Comprobante de Domicilio */}
                                        <div 
                                            className={styles.uploadBox}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'comprobante')}
                                        >
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
                                                        onClick={() => eliminarDocumento('comprobante')}
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
                                                <>
                                                    <small style={{ color: '#9ca3af', marginBottom: '8px' }}>
                                                        Arrastra aquí o selecciona
                                                    </small>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*,.pdf" 
                                                        onChange={(e) => handleDocumentoChange(e, 'comprobante')}
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        
                                        {/* Otros Documentos */}
                                        <div 
                                            className={styles.uploadBox}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'otros')}
                                        >
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
                                                        onClick={() => eliminarDocumento('otros')}
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
                                                <>
                                                    <small style={{ color: '#9ca3af', marginBottom: '8px' }}>
                                                        Arrastra aquí o selecciona
                                                    </small>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*,.pdf" 
                                                        onChange={(e) => handleDocumentoChange(e, 'otros')}
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                </>
                                            )}
                                        </div>
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
                                disabled={guardando}
                            >
                                {guardando ? '⏳ Guardando...' : '💾 Guardar Cliente'}
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
