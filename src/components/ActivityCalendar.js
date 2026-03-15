'use client';

import { useState, useEffect } from 'react';
import styles from './ActivityCalendar.module.css';
import {
  getVentas,
  getCompras,
  getAbonos,
  getClientes,
  getProveedores,
  getProductos,
  updateVenta
} from '@/lib/storage';
import { getUnifiedEvents, addCustomEvent } from '@/lib/calendar';
import ImageModal from './ImageModal';
import FacturaPreview from './factura/FacturaPreview';

/**
 * ActivityCalendar - Componente reutilizable de calendario de actividad
 * 
 * @param {string} type - Tipo de actividad: 'ventas' | 'compras' | 'abonos'
 * @param {string} clienteId - Opcional: Filtrar por cliente específico
 * @param {string} proveedorId - Opcional: Filtrar por proveedor específico
 * @param {function} onClose - Función para cerrar el modal
 */
export default function ActivityCalendar({ type = 'ventas', clienteId = null, proveedorId = null, onClose, onActivityClick }) {
  const [vista, setVista] = useState('anual'); // 'anual' | 'mensual' | 'diaria'
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [actividadesDia, setActividadesDia] = useState([]);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]); // 🆕 Productos para imágenes
  const [modalImagen, setModalImagen] = useState({ show: false, url: '' }); // 🆕 Modal de imagen
  const [mostrarFactura, setMostrarFactura] = useState(false); // 🆕 Modal de imagen
  const [mostrarNuevoEvento, setMostrarNuevoEvento] = useState(false); // 🆕 Modal Nuevo Evento
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], hora: '12:00' });

  const [edicionFecha, setEdicionFecha] = useState(false); // 🆕 Estado para editar fecha
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState(''); // 🆕 Valor temporal fecha

  const handleGuardarNuevaFecha = async () => {
    if (!actividadSeleccionada || !nuevaFechaVencimiento) return;

    // Preparar historial de cambios
    const fechaAnterior = actividadSeleccionada.fechaVencimiento;
    const historialNuevo = [
      ...(actividadSeleccionada.historialVencimientos || []),
      {
        fechaAnterior: fechaAnterior || 'Sin definir',
        fechaNueva: nuevaFechaVencimiento,
        fechaCambio: new Date().toISOString()
      }
    ];

    // 1. Actualizar en Storage con historial
    await updateVenta(actividadSeleccionada.originalId, {
      fechaVencimiento: nuevaFechaVencimiento,
      historialVencimientos: historialNuevo
    });

    // 2. Actualizar estado local para reflejo inmediato
    const actividadActualizada = {
      ...actividadSeleccionada,
      fechaVencimiento: nuevaFechaVencimiento,
      historialVencimientos: historialNuevo
    };
    setActividadSeleccionada(actividadActualizada);
    setEdicionFecha(false);

    // 3. Disparar evento para recargar calendario
    window.dispatchEvent(new Event('cueramaro_data_updated'));

    alert('Fecha actualizada y cambio registrado en el historial.');
  };

  const handleGuardarEvento = async (e) => {
    e.preventDefault();
    if (!nuevoEvento.titulo) return;

    await addCustomEvent({
      ...nuevoEvento,
      fecha: `${nuevoEvento.fecha}T${nuevoEvento.hora}:00.000Z` // Formato ISO simple
    });

    setMostrarNuevoEvento(false);
    setNuevoEvento({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], hora: '12:00' });

    // Recargar datos manual (aunque el listener debería hacerlo)
    window.dispatchEvent(new Event('cueramaro_data_updated'));
  };

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Cargar datos según el tipo y escuchar cambios
  useEffect(() => {
    const cargarDatos = async () => {
      let datos = [];
      const clientesBase = await getClientes();

      if (type === 'general') {
        // 🆕 Usar la nueva API centralizada
        datos = await getUnifiedEvents();

        // 🆕 AGREGAR VENCIMIENTOS DE VENTAS A CRÉDITO
        const ventasCredito = (await getVentas()).filter(v => v.tipoFactura === 'credito' && v.fechaVencimiento);
        const eventosVencimiento = ventasCredito.map(v => {
          const cli = clientesBase.find(c => c.id === v.clienteId);
          return {
            id: `vencimiento-${v.id}`,
            tipo: 'recordatorio', // Usamos tipo recordatorio para que salga en amarillo/campana
            titulo: `🔴 Vence Venta #${v.id}`,
            descripcion: `Vencimiento de crédito de ${cli ? cli.nombre : 'Cliente Desconocido'}. Monto: ${formatearMoneda(v.total)}`,
            fecha: `${v.fechaVencimiento}T09:00:00.000Z`, // Asumimos 9 AM para ordenar
            monto: v.total,
            clienteId: v.clienteId
          };
        });

        datos = [...datos, ...eventosVencimiento];

      } else if (type === 'ventas') {
        datos = (await getVentas()).map(v => ({ ...v, tipo: 'venta', monto: v.total }));
        if (clienteId) {
          datos = datos.filter(v => v.clienteId === clienteId);
        }
      } else if (type === 'compras') {
        datos = (await getCompras()).map(c => ({ ...c, tipo: 'compra', monto: c.total }));
        if (proveedorId) {
          datos = datos.filter(c => c.proveedorId === proveedorId);
        }
      } else if (type === 'abonos') {
        datos = (await getAbonos()).map(a => ({ ...a, tipo: 'abono', monto: a.monto }));
        if (clienteId) {
          datos = datos.filter(a => a.clienteId === clienteId);
        }
      }

      // Ordenar por fecha (descendente) para que al ver el día salgan los últimos primero
      datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setActividades(datos);
      setClientes(clientesBase);
      setProveedores(await getProveedores());
      setProductos(await getProductos()); // 🆕 Cargar productos
    };

    cargarDatos();
    window.addEventListener('cueramaro_data_updated', cargarDatos);
    return () => window.removeEventListener('cueramaro_data_updated', cargarDatos);
  }, [type, clienteId, proveedorId]);

  // Filtros de Tipo (Solo para vista general)
  const [filtros, setFiltros] = useState({
    venta: false,
    compra: false,
    abono: false,
    gasto: false,
    nota: false,
    merma: false,
    recordatorio: false // 🆕
  });

  const toggleFiltro = (tipo) => {
    setFiltros(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  const actividadesFiltradas = actividades.filter(a => {
    if (type !== 'general') return true;
    const tipoReal = a.tipo || (type === 'ventas' ? 'venta' : type === 'compras' ? 'compra' : 'abono');
    return filtros[tipoReal] === true;
  });

  // Obtener cantidad de actividades por fecha
  const getActividadesPorFecha = (fecha) => {
    return actividadesFiltradas.filter(a => {
      const fechaActividad = new Date(a.fecha);
      return fechaActividad.toDateString() === fecha.toDateString();
    });
  };

  // Obtener cantidad de actividades por mes
  const getActividadesPorMes = (mes, anio) => {
    return actividadesFiltradas.filter(a => {
      const fecha = new Date(a.fecha);
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }).length;
  };

  // Obtener color según cantidad
  const getColorClase = (cantidad) => {
    if (cantidad === 0) return '';
    if (cantidad <= 5) return styles.actividadBaja;
    if (cantidad <= 15) return styles.actividadMedia;
    return styles.actividadAlta;
  };

  // Formatear indicador de cantidad
  const formatearCantidad = (cantidad) => {
    if (cantidad === 0) return '';
    if (cantidad > 20) return '20+';
    return cantidad.toString();
  };

  // Generar días del mes
  const generarDiasMes = () => {
    const primerDia = new Date(anioSeleccionado, mesSeleccionado, 1);
    const ultimoDia = new Date(anioSeleccionado, mesSeleccionado + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicio = primerDia.getDay();

    const dias = [];

    // Días vacíos antes del primer día del mes
    for (let i = 0; i < diaInicio; i++) {
      dias.push({ dia: null, actividades: [] });
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(anioSeleccionado, mesSeleccionado, dia);
      const actividadesDia = getActividadesPorFecha(fecha);
      dias.push({ dia, actividades: actividadesDia, fecha });
    }

    return dias;
  };

  // Manejar clic en día
  const handleDiaClick = (diaInfo) => {
    if (diaInfo.dia && diaInfo.actividades.length > 0) {
      setDiaSeleccionado(diaInfo.dia);
      setActividadesDia(diaInfo.actividades);
      setVista('diaria');
    }
  };

  // Manejar clic en mes
  const handleMesClick = (mes) => {
    setMesSeleccionado(mes);
    setVista('mensual');
  };

  // Obtener nombre del cliente
  const getNombreCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Cliente Desconocido';
  };

  // Obtener nombre del proveedor
  const getNombreProveedor = (proveedorId) => {
    const proveedor = proveedores.find(p => p.id === proveedorId);
    return proveedor ? proveedor.nombre : 'Proveedor Desconocido';
  };

  // Formatear moneda
  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad || 0);
  };

  // Generar años disponibles (5 años atrás y 2 adelante)
  const aniosDisponibles = [];
  const anioActual = new Date().getFullYear();
  for (let i = anioActual - 5; i <= anioActual + 2; i++) {
    aniosDisponibles.push(i);
  }

  // Obtener título según tipo
  const getTitulo = () => {
    switch (type) {
      case 'ventas': return '📅 Calendario de Ventas';
      case 'compras': return '📅 Calendario de Compras';
      case 'abonos': return '📅 Calendario de Abonos';
      case 'general': return '📅 Calendario Global';
      default: return '📅 Calendario de Actividad';
    }
  };

  // Íconos por tipo
  const getIconoTipo = (tipo) => {
    switch (tipo) {
      case 'venta': return '🛒';
      case 'compra': return '📦';
      case 'abono': return '💰';
      case 'gasto': return '💸';
      case 'nota': return '📝';
      case 'merma': return '📉';
      case 'recordatorio': return '🔔';
      default: return '🔹';
    }
  };

  // Financiero del día
  const getResumenFinancieroDia = (actividades) => {
    const ventas = actividades.filter(a => a.tipo === 'venta').reduce((sum, a) => sum + a.monto, 0);
    const abonos = actividades.filter(a => a.tipo === 'abono').reduce((sum, a) => sum + a.monto, 0);
    const gastos = actividades.filter(a => a.tipo === 'gasto').reduce((sum, a) => sum + a.monto, 0);
    const compras = actividades.filter(a => a.tipo === 'compra').reduce((sum, a) => sum + a.monto, 0);

    return {
      ingresos: ventas + abonos,
      egresos: gastos + compras,
      neto: (ventas + abonos) - (gastos + compras)
    };
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>{getTitulo()}</h2>
            <div className={styles.navegacion}>
              {vista !== 'anual' && (
                <button
                  className={styles.btnNavegar}
                  onClick={() => {
                    if (vista === 'diaria') setVista('mensual');
                    else if (vista === 'mensual') setVista('anual');
                    else if (vista === 'detalle') setVista('diaria');
                  }}
                >
                  ← Volver
                </button>
              )}
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
                className={styles.selectAnio}
              >
                {aniosDisponibles.map(anio => (
                  <option key={anio} value={anio}>{anio}</option>
                ))}
              </select>
            </div>
            <button className={styles.closeButton} onClick={onClose}>✕</button>
          </div>

          <div className={styles.modalBody}>
            {/* Filtros por Tipo (Solo Global) */}
            {type === 'general' && (
              <div className={styles.filtrosContainer}>
                <span className={styles.filtrosLabel}>Filtrar Actividad:</span>
                <div className={styles.filtrosGrid}>
                  {/* Botón Nuevo Recordatorio */}
                  <button
                    className={styles.btnNuevoEvento}
                    onClick={() => setMostrarNuevoEvento(true)}
                    style={{ gridColumn: '1 / -1', marginBottom: '10px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    + Nuevo Recordatorio
                  </button>

                  <button
                    className={`${styles.filtroBtn} ${filtros.venta ? styles.activo : ''} ${styles.fVenta}`}
                    onClick={() => toggleFiltro('venta')}
                  >
                    🛒 Ventas
                  </button>
                  <button
                    className={`${styles.filtroBtn} ${filtros.abono ? styles.activo : ''} ${styles.fAbono}`}
                    onClick={() => toggleFiltro('abono')}
                  >
                    💰 Abonos
                  </button>
                  <button
                    className={`${styles.filtroBtn} ${filtros.compra ? styles.activo : ''} ${styles.fCompra}`}
                    onClick={() => toggleFiltro('compra')}
                  >
                    📦 Compras
                  </button>
                  <button
                    className={`${styles.filtroBtn} ${filtros.gasto ? styles.activo : ''} ${styles.fGasto}`}
                    onClick={() => toggleFiltro('gasto')}
                  >
                    💸 Gastos
                  </button>
                  <button
                    className={`${styles.filtroBtn} ${filtros.merma ? styles.activo : ''} ${styles.fMerma}`}
                    onClick={() => toggleFiltro('merma')}
                  >
                    📉 Mermas
                  </button>
                  <button
                    className={`${styles.filtroBtn} ${filtros.nota ? styles.activo : ''} ${styles.fNota}`}
                    onClick={() => toggleFiltro('nota')}
                  >
                    📝 Notas
                  </button>
                  <button
                    className={`${styles.filtroBtn} ${filtros.recordatorio ? styles.activo : ''}`}
                    onClick={() => toggleFiltro('recordatorio')}
                    style={{ background: filtros.recordatorio ? '#64748b' : '#f1f5f9', color: filtros.recordatorio ? 'white' : '#64748b' }}
                  >
                    🔔 Recordatorios
                  </button>
                </div>
              </div>
            )}

            {/* Leyenda de colores */}
            <div className={styles.leyenda}>
              <span className={styles.leyendaItem}>
                <span className={`${styles.indicador} ${styles.actividadBaja}`}></span>
                1-5 (Normal)
              </span>
              <span className={styles.leyendaItem}>
                <span className={`${styles.indicador} ${styles.actividadMedia}`}></span>
                6-15 (Media)
              </span>
              <span className={styles.leyendaItem}>
                <span className={`${styles.indicador} ${styles.actividadAlta}`}></span>
                16+ (Alta)
              </span>
            </div>

            {/* Vista Anual - Meses */}
            {vista === 'anual' && (
              <div className={styles.gridMeses}>
                {meses.map((mes, index) => {
                  const cantidad = getActividadesPorMes(index, anioSeleccionado);
                  return (
                    <div
                      key={mes}
                      className={`${styles.cardMes} ${getColorClase(cantidad)}`}
                      onClick={() => handleMesClick(index)}
                    >
                      <span className={styles.nombreMes}>{mes}</span>
                      {cantidad > 0 && (
                        <span className={styles.cantidadMes}>
                          {formatearCantidad(cantidad)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vista Mensual - Días */}
            {vista === 'mensual' && (
              <>
                <h3 className={styles.tituloMes}>{meses[mesSeleccionado]} {anioSeleccionado}</h3>
                <div className={styles.gridDiasSemana}>
                  {diasSemana.map(dia => (
                    <div key={dia} className={styles.diaSemana}>{dia}</div>
                  ))}
                </div>
                <div className={styles.gridDias}>
                  {generarDiasMes().map((diaInfo, index) => (
                    <div
                      key={index}
                      className={`${styles.cardDia} ${diaInfo.dia ? getColorClase(diaInfo.actividades.length) : styles.diaVacio}`}
                      onClick={() => diaInfo.dia && handleDiaClick(diaInfo)}
                    >
                      {diaInfo.dia && (
                        <>
                          <span className={styles.numeroDia}>{diaInfo.dia}</span>
                          {diaInfo.actividades.length > 0 && (
                            <span className={styles.cantidadDia}>
                              {formatearCantidad(diaInfo.actividades.length)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}



            {/* Vista Diaria - Detalle */}
            {vista === 'diaria' && (
              <>
                <h3 className={styles.tituloMes}>
                  {diaSeleccionado} de {meses[mesSeleccionado]} {anioSeleccionado}
                </h3>

                {type === 'general' && (
                  <div className={styles.resumenFinanciero}>
                    {(() => {
                      const resumen = getResumenFinancieroDia(actividadesDia);
                      return (
                        <>
                          <div className={styles.resumenItem}>
                            <span className={styles.resumenLabel}>Ingresos</span>
                            <span className={styles.resumenValue} style={{ color: '#059669' }}>
                              +{formatearMoneda(resumen.ingresos)}
                            </span>
                          </div>
                          <div className={styles.resumenItem}>
                            <span className={styles.resumenLabel}>Egresos</span>
                            <span className={styles.resumenValue} style={{ color: '#dc2626' }}>
                              -{formatearMoneda(resumen.egresos)}
                            </span>
                          </div>
                          <div className={`${styles.resumenItem} ${styles.resumenNeto}`}>
                            <span className={styles.resumenLabel}>Neto</span>
                            <span className={styles.resumenValue} style={{ color: resumen.neto >= 0 ? '#059669' : '#dc2626' }}>
                              {formatearMoneda(resumen.neto)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className={styles.listaActividades}>
                  {actividadesDia.filter(a => {
                    if (type !== 'general') return true;
                    const tipoReal = a.tipo || (type === 'ventas' ? 'venta' : type === 'compras' ? 'compra' : 'abono');
                    return filtros[tipoReal] === true;
                  }).map((actividad, index) => (
                    <div
                      key={index}
                      className={`${styles.itemActividad} ${styles['tipo_' + (actividad.tipo || type.slice(0, -1))]}`}
                      onClick={() => {
                        if (onActivityClick) {
                          onActivityClick(actividad);
                        } else {
                          setActividadSeleccionada(actividad);
                          setVista('detalle');
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.actividadIcono}>
                        {getIconoTipo(actividad.tipo || (type === 'ventas' ? 'venta' : type === 'compras' ? 'compra' : 'abono'))}
                      </div>
                      <div className={styles.actividadInfo}>
                        {(type === 'ventas' || actividad.tipo === 'venta') && (
                          <>
                            <span className={styles.actividadTitulo}>
                              Venta a
                              <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px' }}>
                                {(() => {
                                  const cliente = clientes.find(c => c.id === actividad.clienteId);
                                  return cliente?.avatarURL ? (
                                    <img
                                      src={cliente.avatarURL}
                                      alt="Avatar"
                                      style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', margin: '0 5px' }}
                                    />
                                  ) : null;
                                })()}
                                {getNombreCliente(actividad.clienteId)}
                              </span>
                            </span>
                            <span className={styles.actividadMonto}>
                              {formatearMoneda(actividad.total)}
                            </span>
                            <span className={styles.actividadDetalle}>
                              {actividad.productos?.length || 0} productos {actividad.tipo === 'venta' && actividad.tipoVenta === 'credito' && '💳'}
                            </span>
                          </>
                        )}
                        {(type === 'compras' || actividad.tipo === 'compra') && (
                          <>
                            <span className={styles.actividadTitulo}>
                              Compra a {getNombreProveedor(actividad.proveedorId)}
                            </span>
                            <span className={styles.actividadMonto}>
                              {formatearMoneda(actividad.total)}
                            </span>
                          </>
                        )}
                        {(type === 'abonos' || actividad.tipo === 'abono') && (
                          <>
                            <span className={styles.actividadTitulo}>
                              Abono de
                              <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px' }}>
                                {(() => {
                                  const cliente = clientes.find(c => c.id === actividad.clienteId);
                                  return cliente?.avatarURL ? (
                                    <img
                                      src={cliente.avatarURL}
                                      alt="Avatar"
                                      style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', margin: '0 5px' }}
                                    />
                                  ) : null;
                                })()}
                                {getNombreCliente(actividad.clienteId)}
                              </span>
                            </span>
                            <span className={styles.actividadMonto}>
                              {formatearMoneda(actividad.monto)}
                            </span>
                            <span className={styles.actividadDetalle}>
                              {actividad.metodoPago || 'Sin especificar'}
                            </span>
                          </>
                        )}
                        {actividad.tipo === 'gasto' && (
                          <>
                            <span className={styles.actividadTitulo}>
                              {actividad.descripcion || 'Gasto General'}
                            </span>
                            <span className={styles.actividadMonto} style={{ color: '#dc2626' }}>
                              -{formatearMoneda(actividad.monto)}
                            </span>
                            <span className={styles.actividadDetalle}>
                              {actividad.categoria}
                            </span>
                          </>
                        )}
                        {actividad.tipo === 'merma' && (
                          <>
                            <span className={styles.actividadTitulo}>
                              Merma: {actividad.productoNombre || 'Producto'} ({actividad.cantidad})
                            </span>
                            <span className={styles.actividadMonto} style={{ color: '#e53e3e' }}>
                              -{formatearMoneda(actividad.costoTotal)}
                            </span>
                            <span className={styles.actividadDetalle}>
                              {actividad.motivo}
                            </span>
                          </>
                        )}
                        {actividad.tipo === 'nota' && (
                          <>
                            <span className={styles.actividadTitulo}>
                              Nota: {actividad.titulo}
                            </span>
                            <span className={styles.actividadDetalle}>
                              {actividad.contenido?.substring(0, 30)}...
                            </span>
                          </>
                        )}
                      </div>
                      {(actividad.comprobanteURL || actividad.adjuntoURL || actividad.imagenComprobante) && (
                        <span className={styles.tieneComprobante}>📎</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* =================================================================================
              VISTA DE DETALLE "MODO DIOS" (360°)
             ================================================================================= */}
            {vista === 'detalle' && actividadSeleccionada && (() => {
              // 1. Normalización de Datos
              // ---------------------------------------------------------------------------------
              const tipoReal = actividadSeleccionada.tipo || (type === 'ventas' ? 'venta' : type === 'compras' ? 'compra' : 'abono');
              const actividad = { ...actividadSeleccionada, tipo: tipoReal };

              // 2. Lookups (Búsqueda de Datos Enriquecidos)
              // ---------------------------------------------------------------------------------
              const clienteFull = clientes.find(c => c.id === actividad.clienteId) || {};
              const proveedorFull = proveedores.find(p => p.id === actividad.proveedorId) || {};
              const productosEnriquecidos = (actividad.productos || []).map(item => {
                const prodCatalogo = productos.find(p => p.id === item.id || p.id === item.productoId) || {};
                return { ...item, imagenURL: prodCatalogo.imagenURL };
              });

              // 3. Estilos en línea para "Modo Dios"
              // ---------------------------------------------------------------------------------
              const cardStyle = {
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              };

              const titleStyle = {
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              };

              const gridStyle = {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px'
              };

              // 4. Renderizado del Detalle
              // ---------------------------------------------------------------------------------
              return (
                <div className="detalle-container" style={{ padding: '20px', paddingBottom: '80px' }}>

                  {/* CABECERA PRINCIPAL */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
                    <div style={{ fontSize: '3rem', marginRight: '20px' }}>
                      {getIconoTipo(actividad.tipo)}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
                        {(actividad.nombre || actividad.tipo || 'Actividad').toUpperCase()}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '1rem' }}>
                        {new Date(actividad.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' • '}
                        {new Date(actividad.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: actividad.tipo === 'venta' ? '#dbeafe' : actividad.tipo === 'gasto' ? '#fee2e2' : '#f3f4f6',
                        color: actividad.tipo === 'venta' ? '#1e40af' : actividad.tipo === 'gasto' ? '#991b1b' : '#374151'
                      }}>
                        ID: #{actividad.id}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                    {/* COLUMNA IZQUIERDA: PARTICIPANTES Y DETALLES */}
                    <div>
                      {/* 👤 FICHA DEL PARTICIPANTE (Cliente o Proveedor) */}
                      {(actividad.tipo === 'venta' || actividad.tipo === 'abono' || actividad.tipo === 'compra') && (
                        <div style={cardStyle}>
                          <h4 style={titleStyle}>
                            {actividad.tipo === 'compra' ? '👤 PROVEEDOR' : '👤 CLIENTE'}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {/* FOTO/AVATAR */}
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              marginRight: '16px',
                              background: '#e2e8f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.5rem', border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}>
                              {(actividad.tipo === 'compra' ? proveedorFull.imagenURL : clienteFull.avatarURL) ? (
                                <img
                                  src={actividad.tipo === 'compra' ? proveedorFull.imagenURL : clienteFull.avatarURL}
                                  alt="Avatar"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onClick={() => setModalImagen({ show: true, url: (actividad.tipo === 'compra' ? proveedorFull.imagenURL : clienteFull.avatarURL) })}
                                />
                              ) : (
                                <span>{(actividad.tipo === 'compra' ? 'P' : 'C')}</span>
                              )}
                            </div>
                            {/* DATOS TEXTO */}
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                                {actividad.clienteNombre || actividad.proveedorNombre || 'Desconocido'}
                              </div>
                              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                {actividad.tipo === 'venta' && clienteFull.telefono ? `📞 ${clienteFull.telefono}` : ''}
                                {actividad.tipo === 'compra' && proveedorFull.contacto ? `👤 Contacto: ${proveedorFull.contacto}` : ''}
                              </div>
                              {actividad.tipo === 'venta' && (
                                <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '4px' }}>
                                  Saldo Actual: {formatearMoneda(clienteFull.saldoPendiente || 0)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 📦 DETALLE DE PRODUCTOS (Solo Ventas y Compras) */}
                      {(actividad.productos && actividad.productos.length > 0) && (
                        <div style={cardStyle}>
                          <h4 style={titleStyle}>📦 PRODUCTOS ({actividad.productos.length})</h4>
                          <div style={gridStyle}>
                            {productosEnriquecidos.map((prod, index) => (
                              <div key={index} style={{
                                background: 'white',
                                borderRadius: '8px',
                                padding: '8px',
                                border: '1px solid #f1f5f9',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                              }}>
                                {/* FOTO PRODUCTO */}
                                <div style={{
                                  width: '100%', height: '80px',
                                  marginBottom: '8px', borderRadius: '4px', overflow: 'hidden',
                                  background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  {prod.imagenURL ? (
                                    <img
                                      src={prod.imagenURL}
                                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                      onClick={() => setModalImagen({ show: true, url: prod.imagenURL })}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '1.5rem' }}>🥩</span>
                                  )}
                                </div>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.2', marginBottom: '4px' }}>
                                  {prod.nombre}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {prod.cantidad} {prod.unidad || 'kg'} x {formatearMoneda(prod.precioUnitario || prod.precio || 0)}
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#0ea5e9', marginTop: '4px' }}>
                                  = {formatearMoneda((prod.cantidad * (prod.precioUnitario || prod.precio || 0)))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 📝 NOTAS / DESCRIPCIÓN (Para Gastos y Notas) */}
                      {(actividad.tipo === 'gasto' || actividad.tipo === 'nota' || actividad.descripcion) && (
                        <div style={cardStyle}>
                          <h4 style={titleStyle}>📝 DESCRIPCIÓN / NOTAS</h4>
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
                            {actividad.descripcion || actividad.notas || actividad.nota || 'Sin descripción'}
                          </p>
                          {actividad.tipo === 'gasto' && (
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', color: '#475569' }}>
                                Categoría: {actividad.categoria || 'General'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* COLUMNA DERECHA: FINANZAS Y EVIDENCIA */}
                    <div>
                      {/* 💰 FICHA FINANCIERA */}
                      <div style={{ ...cardStyle, background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: 'none' }}>
                        <h4 style={titleStyle}>💰 RESUMEN FINANCIERO</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                          {/* Subtotal / Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#64748b' }}>Total Operación</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                              {formatearMoneda(actividad.total || actividad.monto || actividad.costoTotal || 0)}
                            </span>
                          </div>

                          {/* Método de Pago */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '8px 0', borderTop: '1px dashed #e2e8f0' }}>
                            <span style={{ color: '#64748b' }}>Método de Pago</span>
                            <span style={{
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              fontSize: '0.9rem',
                              color: actividad.metodoPago === 'efectivo' || actividad.metodoPago === 'contado' ? '#059669' : '#d97706'
                            }}>
                              {actividad.metodoPago || 'N/A'}
                            </span>
                          </div>

                          {/* Utilidad (Solo Ventas) */}
                          {actividad.tipo === 'venta' && actividad.utilidadReal !== undefined && (
                            <div style={{
                              background: '#ecfdf5',
                              padding: '10px',
                              borderRadius: '8px',
                              marginTop: '8px',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                              <span style={{ color: '#047857', fontWeight: '600' }}>✨ Utilidad Real</span>
                              <span style={{ color: '#047857', fontWeight: 'bold' }}>
                                {formatearMoneda(actividad.utilidadReal)}
                              </span>
                            </div>
                          )}

                          {/* Estado (Pagado/Pendiente) */}
                          {actividad.estado && (
                            <div style={{ marginTop: '8px', textAlign: 'right' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                background: actividad.estado === 'pagado' ? '#dcfce7' : '#fef9c3',
                                color: actividad.estado === 'pagado' ? '#166534' : '#854d0e'
                              }}>
                                {actividad.estado.toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* 📅 FECHA DE VENCIMIENTO (Editable para Crédito) */}
                          {actividad.tipo === 'venta' && actividad.tipoFactura === 'credito' && (
                            <div style={{ marginTop: '12px', padding: '10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#c2410c' }}>📅 Vencimiento</span>
                                {!edicionFecha && (
                                  <button
                                    onClick={() => {
                                      setNuevaFechaVencimiento(actividad.fechaVencimiento || '');
                                      setEdicionFecha(true);
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                    title="Cambiar fecha de pago"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>

                              {edicionFecha ? (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <input
                                    type="date"
                                    value={nuevaFechaVencimiento}
                                    onChange={(e) => setNuevaFechaVencimiento(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]} // No permitir fechas pasadas
                                    style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                  />
                                  <button
                                    onClick={handleGuardarNuevaFecha}
                                    style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEdicionFecha(false)}
                                    style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.9rem', color: '#9a3412' }}>
                                  {/* Mostrar historial si existe */}
                                  {actividad.historialVencimientos && actividad.historialVencimientos.length > 0 && (
                                    <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: '#7c2d12', borderBottom: '1px dashed #fdba74', paddingBottom: '4px' }}>
                                      <strong>Historial de cambios:</strong>
                                      {actividad.historialVencimientos.map((cambio, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                          <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                                            {cambio.fechaAnterior === 'Sin definir' ? 'Inicial' : new Date(cambio.fechaAnterior + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                          </span>
                                          <span>→</span>
                                          <span>
                                            {new Date(cambio.fechaNueva + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Fecha Actual Vigente */}
                                  <div style={{ fontWeight: 'bold' }}>
                                    {actividad.fechaVencimiento
                                      ? new Date(actividad.fechaVencimiento + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
                                      : 'Sin definir'}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 📎 EVIDENCIA / MULTIMEDIA */}
                      {(actividad.imagenComprobante || actividad.adjuntoURL || actividad.comprobanteURL) && (
                        <div style={cardStyle}>
                          <h4 style={titleStyle}>📎 EVIDENCIA ADJUNTA</h4>
                          <div
                            style={{
                              width: '100%',
                              height: '200px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '1px solid #e2e8f0',
                              position: 'relative'
                            }}
                            onClick={() => setModalImagen({ show: true, url: actividad.imagenComprobante || actividad.adjuntoURL || actividad.comprobanteURL })}
                          >
                            <img
                              src={actividad.imagenComprobante || actividad.adjuntoURL || actividad.comprobanteURL}
                              alt="Evidencia"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
                              Clic para ampliar 🔍
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BOTONES DE ACCIÓN */}
                      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        {actividad.tipo === 'venta' && (
                          <button
                            onClick={() => setMostrarFactura(true)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              background: '#0f172a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                          >
                            📄 Ver Nota / Factura
                          </button>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Modal de Imagen Ampliada */}
                  {modalImagen.show && (
                    <ImageModal
                      imageUrl={modalImagen.url}
                      onClose={() => setModalImagen({ show: false, url: '' })}
                    />
                  )}

                  {/* Modal de Factura */}
                  {mostrarFactura && (
                    <FacturaPreview
                      factura={{
                        ...actividad,
                        numeroFactura: `NOTA-${actividad.id}`,
                        cliente: clienteFull,
                        productos: productosEnriquecidos,
                        fecha: actividad.fecha,
                        total: actividad.total || actividad.monto,
                        metodoPago: actividad.metodoPago || 'Contado'
                      }}
                      onClose={() => setMostrarFactura(false)}
                    />
                  )}

                </div>
              );
            })()}
          </div>
        </div>
      </div>
      {/* Modal Nuevo Evento */}
      {mostrarNuevoEvento && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }} onClick={() => setMostrarNuevoEvento(false)}>
          <div className={styles.modal} style={{ maxWidth: '500px', height: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>🔔 Nuevo Recordatorio</h2>
              <button className={styles.closeButton} onClick={() => setMostrarNuevoEvento(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleGuardarEvento} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Título</label>
                  <input
                    type="text"
                    required
                    value={nuevoEvento.titulo}
                    onChange={e => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
                    placeholder="Ej. Pagar Luz, Cita Proveedor..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fecha</label>
                    <input
                      type="date"
                      required
                      value={nuevoEvento.fecha}
                      onChange={e => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hora</label>
                    <input
                      type="time"
                      required
                      value={nuevoEvento.hora}
                      onChange={e => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Descripción (Opcional)</label>
                  <textarea
                    value={nuevoEvento.descripcion}
                    onChange={e => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
                    placeholder="Detalles adicionales..."
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#3b82f6', color: 'white', padding: '12px',
                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'
                  }}
                >
                  Guardar Recordatorio
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
