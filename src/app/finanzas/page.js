'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './finanzas.module.css';
import { getVentas, getGastos, getAbonos, getClientes } from '@/lib/storage';

export default function FinanzasPage() {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    setVentas(getVentas());
    setGastos(getGastos());
    setAbonos(getAbonos());
    setClientes(getClientes());
  }, []);

  // Obtener fechas
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // Filtrar por fechas
  const esHoy = (fecha) => new Date(fecha).toDateString() === hoy.toDateString();
  const esSemana = (fecha) => new Date(fecha) >= inicioSemana;
  const esMes = (fecha) => new Date(fecha) >= inicioMes;

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

  // Abonos
  const abonosHoy = abonos.filter(a => esHoy(a.fecha));
  const totalAbonosHoy = abonosHoy.reduce((sum, a) => sum + a.monto, 0);

  // Flujo de Caja
  const flujoCajaHoy = ventasContadoHoy + totalAbonosHoy - totalGastosHoy;
  const flujoCajaSemana = ventasSemana.filter(v => v.metodoPago === 'contado').reduce((sum, v) => sum + v.total, 0) 
    + abonos.filter(a => esSemana(a.fecha)).reduce((sum, a) => sum + a.monto, 0)
    - totalGastosSemana;

  // Cuentas por Cobrar
  const totalPendiente = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
  const clientesConDeuda = clientes.filter(c => c.saldoPendiente > 0);

  // Utilidad
  const utilidadHoy = totalVentasHoy - totalGastosHoy;
  const utilidadSemana = totalVentasSemana - totalGastosSemana;
  const utilidadMes = totalVentasMes - totalGastosMes;

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
                      {cliente.nombre.charAt(0).toUpperCase()}
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

      {/* Accesos Rápidos */}
      <section className={styles.accesosSection}>
        <h2 className={styles.seccionTitulo}>⚡ Accesos Rápidos</h2>
        <div className={styles.accesosGrid}>
          <Link href="/ventas" className={styles.accesoCard}>
            <span className={styles.accesoIcon}>🛒</span>
            <span className={styles.accesoLabel}>Nueva Venta</span>
          </Link>
          <Link href="/gastos" className={styles.accesoCard}>
            <span className={styles.accesoIcon}>💸</span>
            <span className={styles.accesoLabel}>Registrar Gasto</span>
          </Link>
          <Link href="/creditos" className={styles.accesoCard}>
            <span className={styles.accesoIcon}>💵</span>
            <span className={styles.accesoLabel}>Cobrar Abono</span>
          </Link>
          <Link href="/reportes" className={styles.accesoCard}>
            <span className={styles.accesoIcon}>📊</span>
            <span className={styles.accesoLabel}>Ver Reportes</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
