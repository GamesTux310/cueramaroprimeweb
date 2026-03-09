'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './finanzas.module.css';
import { getVentas, getGastos, getAbonos, getClientes, getProveedores } from '@/lib/storage';
import ImageModal from '@/components/ImageModal';

export default function FinanzasPage() {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  // Estados para modales de detalle
  const [detalleGasto, setDetalleGasto] = useState(null);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [detalleAbono, setDetalleAbono] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setVentas(await getVentas());
      setGastos(await getGastos());
      setAbonos(await getAbonos());
      setClientes(await getClientes());
      setProveedores(await getProveedores());
    };
    cargarDatos();
  }, []);

  // Obtener fechas
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

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
  
  const getHora = (fechaInput) => {
    try {
      const date = new Date(fechaInput);
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  // Filtrar por fechas
  const esHoy = (fecha) => parsearFecha(fecha).toDateString() === hoy.toDateString();
  const esSemana = (fecha) => parsearFecha(fecha) >= inicioSemana;
  const esMes = (fecha) => parsearFecha(fecha) >= inicioMes;

  // Ventas
  const ventasHoy = ventas.filter(v => esHoy(v.fecha));
  const ventasSemana = ventas.filter(v => esSemana(v.fecha));
  const ventasMes = ventas.filter(v => esMes(v.fecha));
  
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  const totalVentasSemana = ventasSemana.reduce((sum, v) => sum + v.total, 0);
  const totalVentasMes = ventasMes.reduce((sum, v) => sum + v.total, 0);

  // Contado vs Crédito - Hoy
  const ventasContadoHoy = ventasHoy.filter(v => v.metodoPago === 'contado').reduce((sum, v) => sum + v.total, 0);
  const ventasCreditoHoy = ventasHoy.filter(v => v.metodoPago === 'credito').reduce((sum, v) => sum + v.total, 0);

  // Gastos
  const gastosHoy = gastos.filter(g => esHoy(g.fecha));
  const gastosSemana = gastos.filter(g => esSemana(g.fecha));
  const gastosMes = gastos.filter(g => esMes(g.fecha));
  
  const totalGastosHoy = gastosHoy.reduce((sum, g) => sum + g.monto, 0);
  const totalGastosSemana = gastosSemana.reduce((sum, g) => sum + g.monto, 0);
  const totalGastosMes = gastosMes.reduce((sum, g) => sum + g.monto, 0);

  // Gastos Operativos (Excluyendo compra de mercancía)
  const gastosOpHoy = gastosHoy.filter(g => g.categoria !== 'Mercancía').reduce((sum, g) => sum + g.monto, 0);
  const gastosOpSemana = gastosSemana.filter(g => g.categoria !== 'Mercancía').reduce((sum, g) => sum + g.monto, 0);
  const gastosOpMes = gastosMes.filter(g => g.categoria !== 'Mercancía').reduce((sum, g) => sum + g.monto, 0);

  // Abonos
  const abonosHoy = abonos.filter(a => esHoy(a.fecha));
  const totalAbonosHoy = abonosHoy.reduce((sum, a) => sum + a.monto, 0);

  // Flujo de Caja (Dinero real que entra y sale)
  const flujoCajaHoy = ventasContadoHoy + totalAbonosHoy - totalGastosHoy;
  
  // Cuentas por Cobrar
  const totalPendiente = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
  const clientesConDeuda = clientes.filter(c => c.saldoPendiente > 0);

  // Cuentas por Pagar (Proveedores)
  const totalPorPagar = proveedores.reduce((sum, p) => sum + (p.saldoPendiente || 0), 0);
  const proveedoresConDeuda = proveedores.filter(p => p.saldoPendiente > 0);

  // Utilidad Neta REAL (PEPS)
  // Utilidad Bruta (Ventas - Costo Ventas) - Gastos Operativos
  const utilidadBrutaHoy = ventasHoy.reduce((sum, v) => sum + (v.utilidadReal || 0), 0);
  const utilidadBrutaSemana = ventasSemana.reduce((sum, v) => sum + (v.utilidadReal || 0), 0);
  const utilidadBrutaMes = ventasMes.reduce((sum, v) => sum + (v.utilidadReal || 0), 0);

  const utilidadHoy = utilidadBrutaHoy - gastosOpHoy;
  const utilidadSemana = utilidadBrutaSemana - gastosOpSemana;
  const utilidadMes = utilidadBrutaMes - gastosOpMes;

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cantidad);
  };

  return (
    <main className="main-content">
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backButton}>
              ← Regresar
            </Link>
            <div className={styles.headerTitle}>
              <span className={styles.headerIcon}>💰</span>
              <div>
                <h1>Panel Financiero</h1>
                <p>Resumen de finanzas y flujo de caja</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Flujo de Caja Hoy */}
      <section className={styles.flujoCajaSection}>
        <div className={styles.flujoCajaCard}>
          <h2 className={styles.seccionTitulo}>💵 Flujo de Caja - HOY</h2>
          <div className={styles.flujoGrid}>
            <div className={styles.flujoItem}>
              <div className={styles.flujoIcono} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                📈
              </div>
              <div className={styles.flujoInfo}>
                <span className={styles.flujoLabel}>Ventas Contado</span>
                <span className={styles.flujoMonto} style={{ color: '#10b981' }}>
                  +{formatearMoneda(ventasContadoHoy)}
                </span>
              </div>
            </div>
            <div className={styles.flujoItem}>
              <div className={styles.flujoIcono} style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                📥
              </div>
              <div className={styles.flujoInfo}>
                <span className={styles.flujoLabel}>Abonos Recibidos</span>
                <span className={styles.flujoMonto} style={{ color: '#6366f1' }}>
                  +{formatearMoneda(totalAbonosHoy)}
                </span>
              </div>
            </div>
            <div className={styles.flujoItem}>
              <div className={styles.flujoIcono} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                📉
              </div>
              <div className={styles.flujoInfo}>
                <span className={styles.flujoLabel}>Gastos</span>
                <span className={styles.flujoMonto} style={{ color: '#ef4444' }}>
                  -{formatearMoneda(totalGastosHoy)}
                </span>
              </div>
            </div>
            <div className={`${styles.flujoItem} ${styles.flujoTotal}`}>
              <div className={styles.flujoIcono} style={{ background: flujoCajaHoy >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                {flujoCajaHoy >= 0 ? '✅' : '⚠️'}
              </div>
              <div className={styles.flujoInfo}>
                <span className={styles.flujoLabel}>Saldo del Día</span>
                <span className={styles.flujoMonto} style={{ color: flujoCajaHoy >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatearMoneda(flujoCajaHoy)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Métricas Comparativas */}
      <section className={styles.metricasSection}>
        <div className={styles.metricasGrid}>
          {/* Ventas */}
          <div className={styles.metricaCard}>
            <h3 className={styles.metricaTitulo}>📊 Ventas</h3>
            <div className={styles.metricaFilas}>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Hoy</span>
                <span className={styles.metricaValor}>{formatearMoneda(totalVentasHoy)}</span>
                <span className={styles.metricaCant}>{ventasHoy.length} ventas</span>
              </div>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Semana</span>
                <span className={styles.metricaValor}>{formatearMoneda(totalVentasSemana)}</span>
                <span className={styles.metricaCant}>{ventasSemana.length} ventas</span>
              </div>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Mes</span>
                <span className={styles.metricaValor}>{formatearMoneda(totalVentasMes)}</span>
                <span className={styles.metricaCant}>{ventasMes.length} ventas</span>
              </div>
            </div>
          </div>

          {/* Gastos */}
          <div className={styles.metricaCard}>
            <h3 className={styles.metricaTitulo}>💸 Gastos</h3>
            <div className={styles.metricaFilas}>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Hoy</span>
                <span className={`${styles.metricaValor} ${styles.negativo}`}>{formatearMoneda(totalGastosHoy)}</span>
                <span className={styles.metricaCant}>{gastosHoy.length} gastos</span>
              </div>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Semana</span>
                <span className={`${styles.metricaValor} ${styles.negativo}`}>{formatearMoneda(totalGastosSemana)}</span>
                <span className={styles.metricaCant}>{gastosSemana.length} gastos</span>
              </div>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Mes</span>
                <span className={`${styles.metricaValor} ${styles.negativo}`}>{formatearMoneda(totalGastosMes)}</span>
                <span className={styles.metricaCant}>{gastosMes.length} gastos</span>
              </div>
            </div>
          </div>

          {/* Utilidad */}
          <div className={styles.metricaCard}>
            <h3 className={styles.metricaTitulo}>📈 Utilidad</h3>
            <div className={styles.metricaFilas}>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Hoy</span>
                <span className={`${styles.metricaValor} ${utilidadHoy >= 0 ? styles.positivo : styles.negativo}`}>
                  {formatearMoneda(utilidadHoy)}
                </span>
                <span className={styles.metricaCant}>{totalVentasHoy > 0 ? ((utilidadHoy / totalVentasHoy) * 100).toFixed(0) : 0}% margen</span>
              </div>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Semana</span>
                <span className={`${styles.metricaValor} ${utilidadSemana >= 0 ? styles.positivo : styles.negativo}`}>
                  {formatearMoneda(utilidadSemana)}
                </span>
                <span className={styles.metricaCant}>{totalVentasSemana > 0 ? ((utilidadSemana / totalVentasSemana) * 100).toFixed(0) : 0}% margen</span>
              </div>
              <div className={styles.metricaFila}>
                <span className={styles.metricaPeriodo}>Mes</span>
                <span className={`${styles.metricaValor} ${utilidadMes >= 0 ? styles.positivo : styles.negativo}`}>
                  {formatearMoneda(utilidadMes)}
                </span>
                <span className={styles.metricaCant}>{totalVentasMes > 0 ? ((utilidadMes / totalVentasMes) * 100).toFixed(0) : 0}% margen</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cuentas por Cobrar */}
      <section className={styles.cuentasSection}>
        <div className={styles.cuentasCard}>
          <div className={styles.cuentasHeader}>
            <h2 className={styles.seccionTitulo}>💳 Cuentas por Cobrar</h2>
            <span className={styles.cuentasTotal}>{formatearMoneda(totalPendiente)}</span>
          </div>
          {clientesConDeuda.length === 0 ? (
            <div className={styles.emptyState}>
              <span>✅</span>
              <p>No hay cuentas pendientes</p>
            </div>
          ) : (
            <div className={styles.deudoresList}>
              {clientesConDeuda
                .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
                .slice(0, 5)
                .map(cliente => (
                  <div key={cliente.id} className={styles.deudorItem}>
                    <div className={styles.deudorAvatar}>
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
                    <div className={styles.deudorInfo}>
                      <span className={styles.deudorNombre}>{cliente.nombre}</span>
                      <span className={styles.deudorTel}>{cliente.telefono}</span>
                    </div>
                    <span className={styles.deudorSaldo}>{formatearMoneda(cliente.saldoPendiente)}</span>
                  </div>
                ))}
              {clientesConDeuda.length > 5 && (
                <Link href="/creditos" className={styles.verMasLink}>
                  Ver todos ({clientesConDeuda.length} clientes) →
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cuentas por Pagar (Proveedores) */}
      <section className={styles.cuentasSection} style={{ marginTop: '20px' }}>
        <div className={styles.cuentasCard} style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className={styles.cuentasHeader}>
            <h2 className={styles.seccionTitulo} style={{ color: '#d97706' }}>🧾 Cuentas por Pagar</h2>
            <span className={styles.cuentasTotal} style={{ color: '#ef4444' }}>{formatearMoneda(totalPorPagar)}</span>
          </div>
          {proveedoresConDeuda.length === 0 ? (
            <div className={styles.emptyState}>
              <span>✅</span>
              <p>No hay deudas con proveedores</p>
            </div>
          ) : (
            <div className={styles.deudoresList}>
              {proveedoresConDeuda
                .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
                .slice(0, 5)
                .map(proveedor => (
                  <div key={proveedor.id} className={styles.deudorItem}>
                    <div className={styles.deudorAvatar}>
                      {proveedor.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.deudorInfo}>
                      <span className={styles.deudorNombre}>{proveedor.nombre}</span>
                      <span className={styles.deudorTel}>{proveedor.contacto}</span>
                    </div>
                    <span className={styles.deudorSaldo} style={{ color: '#ef4444' }}>{formatearMoneda(proveedor.saldoPendiente)}</span>
                  </div>
                ))}
            </div>
          )}
          {proveedoresConDeuda.length > 0 && (
             <Link href="/proveedores" className={styles.verMasLink}>
               Gestionar Pagos →
             </Link>
          )}
        </div>
      </section>

      {/* Movimientos del Día */}
      <section className={styles.movimientosSection}>
        <h2 className={styles.seccionTitulo}>📋 Movimientos de Hoy</h2>
        <div className={styles.movimientosList}>
          {/* Ventas del día */}
          {ventasHoy.length > 0 && ventasHoy.map(venta => (
            <div 
              key={`venta-${venta.id}`} 
              className={`${styles.movimientoItem} ${styles.venta}`}
              onClick={() => setDetalleVenta(venta)}
            >
              <div className={styles.movimientoIcono} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                🛒
              </div>
                <div className={styles.movimientoInfo}>
                  <span className={styles.movimientoTipo}>
                    Venta - {venta.clienteNombre || venta.cliente?.nombre || 'Cliente General'}
                  </span>
                  <span className={styles.movimientoDesc}>
                    #{venta.id || '?'} • {venta.metodoPago === 'credito' ? 'Crédito' : 'Contado'} • {venta.productos?.length || 0} prod
                    <span className={styles.movimientoMeta}>{getHora(venta.fecha)}</span>
                  </span>
                </div>
              <span className={styles.movimientoMonto} style={{ color: '#10b981' }}>
                +{formatearMoneda(venta.total)}
              </span>
            </div>
          ))}
          
          {/* Gastos del día */}
          {gastosHoy.length > 0 && gastosHoy.map(gasto => (
            <div 
              key={`gasto-${gasto.id}`} 
              className={`${styles.movimientoItem} ${styles.gasto}`}
              onClick={() => setDetalleGasto(gasto)}
            >
              <div className={styles.movimientoIcono} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                💸
              </div>
              <div className={styles.movimientoInfo}>
                <span className={styles.movimientoTipo}>{gasto.categoria || 'Gasto'}</span>
                <span className={styles.movimientoDesc}>
                  {gasto.descripcion}
                   <span className={styles.movimientoMeta}>{getHora(gasto.fecha)}</span>
                </span>
              </div>
              <span className={styles.movimientoMonto} style={{ color: '#ef4444' }}>
                -{formatearMoneda(gasto.monto)}
              </span>
            </div>
          ))}
          
          {/* Abonos del día */}
          {abonosHoy.length > 0 && abonosHoy.map(abono => (
            <div 
              key={`abono-${abono.id}`} 
              className={`${styles.movimientoItem} ${styles.abono}`}
              onClick={() => setDetalleAbono(abono)}
            >
              <div className={styles.movimientoIcono} style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                💵
              </div>
              <div className={styles.movimientoInfo}>
                <span className={styles.movimientoTipo}>Abono Recibido</span>
                <span className={styles.movimientoDesc}>
                  {clientes.find(c => c.id === abono.clienteId)?.nombre || 'Cliente'}
                  <span className={styles.movimientoMeta}>{getHora(abono.fecha)}</span>
                </span>
              </div>
              <span className={styles.movimientoMonto} style={{ color: '#6366f1' }}>
                +{formatearMoneda(abono.monto)}
              </span>
            </div>
          ))}
          
          {(ventasHoy.length === 0 && gastosHoy.length === 0 && abonosHoy.length === 0) && (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No hay movimientos hoy</p>
            </div>
          )}
        </div>
      </section>



      {/* Modal Detalle Gasto */}
      {detalleGasto && (
        <div className={styles.modalOverlay} onClick={() => setDetalleGasto(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>💸 Detalle del Gasto</h3>
              <button className={styles.modalClose} onClick={() => setDetalleGasto(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Fecha:</span>
                <span className={styles.detalleValor}>{parsearFecha(detalleGasto.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Categoría:</span>
                <span className={styles.detalleValor}>{detalleGasto.categoria || 'Sin categoría'}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Descripción:</span>
                <span className={styles.detalleValor}>{detalleGasto.descripcion}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Monto:</span>
                <span className={styles.detalleValor} style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px' }}>
                  {formatearMoneda(detalleGasto.monto)}
                </span>
              </div>
              {detalleGasto.proveedor && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Proveedor:</span>
                  <span className={styles.detalleValor}>{detalleGasto.proveedor}</span>
                </div>
              )}
              {detalleGasto.imagenComprobante && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Comprobante:</span>
                  <img 
                    src={detalleGasto.imagenComprobante} 
                    alt="Comprobante" 
                    className={styles.comprobanteThumb}
                    onClick={() => setImagenAmpliada(detalleGasto.imagenComprobante)}
                  />
                </div>
              )}
              {detalleGasto.notas && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Notas:</span>
                  <span className={styles.detalleValor}>{detalleGasto.notas}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Venta */}
      {detalleVenta && (
        <div className={styles.modalOverlay} onClick={() => setDetalleVenta(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🛒 Detalle de la Venta</h3>
              <button className={styles.modalClose} onClick={() => setDetalleVenta(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Venta #:</span>
                <span className={styles.detalleValor}>{detalleVenta.id}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Fecha:</span>
                <span className={styles.detalleValor}>{parsearFecha(detalleVenta.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Cliente:</span>
                <span className={styles.detalleValor}>{detalleVenta.cliente?.nombre || 'Cliente General'}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Método de Pago:</span>
                <span className={styles.detalleValor} style={{ textTransform: 'capitalize' }}>{detalleVenta.metodoPago || 'Contado'}</span>
              </div>
              
              {/* Productos */}
              <div className={styles.detalleProductos}>
                <span className={styles.detalleLabel}>Productos:</span>
                <table className={styles.productosTable}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Precio</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleVenta.productos?.map((prod, idx) => {
                      const precio = Number(prod.precioUnitario || prod.precio || 0);
                      const total = Number(prod.subtotal || (prod.cantidad * precio) || 0);
                      return (
                        <tr key={idx}>
                          <td>{prod.nombre}</td>
                          <td>{prod.cantidad} {prod.unidad}</td>
                          <td>{formatearMoneda(precio)}</td>
                          <td>{formatearMoneda(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* 🆕 Desglose de Lotes Consumidos (PEPS) */}
              {detalleVenta.productos?.some(p => p.lotesConsumidos?.length > 0) && (
                <div className={styles.detalleProductos} style={{ marginTop: '15px' }}>
                  <span className={styles.detalleLabel}>📦 Desglose por Lotes (PEPS/FIFO):</span>
                  <div style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    marginTop: '8px',
                    fontSize: '13px' 
                  }}>
                    {detalleVenta.productos?.map((prod, idx) => (
                      prod.lotesConsumidos?.length > 0 && (
                        <div key={idx} style={{ marginBottom: idx < detalleVenta.productos.length - 1 ? '12px' : 0 }}>
                          <div style={{ fontWeight: '600', marginBottom: '6px', color: '#818cf8' }}>
                            {prod.nombre} ({prod.cantidad} {prod.unidad || 'KG'})
                          </div>
                          {prod.lotesConsumidos.map((lote, lIdx) => (
                            <div key={lIdx} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              padding: '4px 8px',
                              background: lote.loteId ? 'rgba(255,255,255,0.1)' : 'rgba(245,158,11,0.2)',
                              borderRadius: '4px',
                              marginBottom: '4px'
                            }}>
                              <span>
                                {lote.loteId ? `Lote #${lote.loteId}` : '⚠️ Sin lote (legacy)'}
                                {' - '}{lote.cantidadConsumida} {prod.unidad || 'KG'}
                              </span>
                              <span style={{ color: '#f59e0b' }}>
                                @ {formatearMoneda(lote.precioCompra)}/u = {formatearMoneda(lote.costoTotal)}
                              </span>
                            </div>
                          ))}
                          {prod.costoReal !== undefined && (
                            <div style={{ textAlign: 'right', fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                              Utilidad Producto: {formatearMoneda((prod.subtotal || prod.cantidad * prod.precioUnitario) - prod.costoReal)}
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              <div className={styles.detalleRow} style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span className={styles.detalleLabel}>Total:</span>
                <span className={styles.detalleValor} style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px' }}>
                  {formatearMoneda(detalleVenta.total)}
                </span>
              </div>
              {detalleVenta.utilidadReal !== undefined && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Utilidad:</span>
                  <span className={styles.detalleValor} style={{ color: '#6366f1' }}>
                    {formatearMoneda(detalleVenta.utilidadReal)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Abono */}
      {detalleAbono && (
        <div className={styles.modalOverlay} onClick={() => setDetalleAbono(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>💵 Detalle del Abono</h3>
              <button className={styles.modalClose} onClick={() => setDetalleAbono(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Fecha:</span>
                <span className={styles.detalleValor}>{parsearFecha(detalleAbono.fecha).toLocaleDateString('es-MX')}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Cliente:</span>
                <span className={styles.detalleValor}>
                  {clientes.find(c => c.id === detalleAbono.clienteId)?.nombre || 'Cliente'}
                </span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Monto:</span>
                <span className={styles.detalleValor} style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '18px' }}>
                  {formatearMoneda(detalleAbono.monto)}
                </span>
              </div>
              {detalleAbono.metodoPago && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Método:</span>
                  <span className={styles.detalleValor}>{detalleAbono.metodoPago}</span>
                </div>
              )}
              {(detalleAbono.comprobante || detalleAbono.comprobanteURL) && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Comprobante:</span>
                  <img 
                    src={detalleAbono.comprobante || detalleAbono.comprobanteURL} 
                    alt="Comprobante" 
                    className={styles.comprobanteThumb}
                    onClick={() => setImagenAmpliada(detalleAbono.comprobante || detalleAbono.comprobanteURL)}
                  />
                </div>
              )}
              {detalleAbono.notas && (
                <div className={styles.detalleRow}>
                  <span className={styles.detalleLabel}>Notas:</span>
                  <span className={styles.detalleValor}>{detalleAbono.notas}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para imagen ampliada */}
      {imagenAmpliada && (
        <ImageModal 
          imageUrl={imagenAmpliada} 
          onClose={() => setImagenAmpliada(null)} 
        />
      )}
    </main>
  );
}
