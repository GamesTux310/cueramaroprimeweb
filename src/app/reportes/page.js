'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './reportes.module.css';
import { getVentas, getGastos, getAbonos, getClientes, getProductos } from '@/lib/storage';

export default function ReportesPage() {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [periodo, setPeriodo] = useState('hoy');

  useEffect(() => {
    const cargarDatos = async () => {
      setVentas(await getVentas());
      setGastos(await getGastos());
      setAbonos(await getAbonos());
      setClientes(await getClientes());
      setProductos(await getProductos());
    };
    cargarDatos();
  }, []);

  // Filtrar por periodo
  const hoy = new Date();
  const filtrarPorPeriodo = (items, fechaKey = 'fecha') => {
    return items.filter(item => {
      const fecha = new Date(item[fechaKey]);
      if (periodo === 'hoy') {
        return fecha.toDateString() === hoy.toDateString();
      }
      if (periodo === 'semana') {
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        return fecha >= hace7Dias;
      }
      if (periodo === 'mes') {
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
      }
      return true;
    });
  };

  const ventasFiltradas = filtrarPorPeriodo(ventas);
  const gastosFiltrados = filtrarPorPeriodo(gastos);
  const abonosFiltrados = filtrarPorPeriodo(abonos);

  // Calcular métricas
  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
  const totalAbonos = abonosFiltrados.reduce((sum, a) => sum + a.monto, 0);
  const utilidadBruta = totalVentas - totalGastos;
  const margenUtilidad = totalVentas > 0 ? ((utilidadBruta / totalVentas) * 100).toFixed(1) : 0;
  
  // Ventas por método de pago
  const ventasContado = ventasFiltradas.filter(v => v.metodoPago === 'contado');
  const ventasCredito = ventasFiltradas.filter(v => v.metodoPago === 'credito');
  const totalContado = ventasContado.reduce((sum, v) => sum + v.total, 0);
  const totalCredito = ventasCredito.reduce((sum, v) => sum + v.total, 0);

  // Top productos vendidos
  const productosVendidos = {};
  ventasFiltradas.forEach(venta => {
    venta.productos.forEach(p => {
      if (!productosVendidos[p.productoId]) {
        productosVendidos[p.productoId] = { 
          nombre: p.nombre, 
          cantidad: 0, 
          total: 0 
        };
      }
      productosVendidos[p.productoId].cantidad += p.cantidad;
      productosVendidos[p.productoId].total += p.subtotal;
    });
  });
  const topProductos = Object.values(productosVendidos)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top Clientes por Utilidad (Rentabilidad)
  const clientesRentabilidad = {};
  ventasFiltradas.forEach(venta => {
    // Usar nombre de cliente o predeterminado
    const clienteKey = venta.clienteNombre || 'Cliente Público';
    
    if (!clientesRentabilidad[clienteKey]) {
      clientesRentabilidad[clienteKey] = {
        nombre: clienteKey,
        totalCompras: 0,
        totalUtilidad: 0,
        count: 0
      };
    }
    clientesRentabilidad[clienteKey].totalCompras += venta.total;
    // Usar utilidadReal (PEPS) o fallback a cálculo simple
    const utilidad = venta.utilidadReal !== undefined ? venta.utilidadReal : (venta.total * 0.2); 
    clientesRentabilidad[clienteKey].totalUtilidad += utilidad;
    clientesRentabilidad[clienteKey].count += 1;
  });

  const topClientes = Object.values(clientesRentabilidad)
    .sort((a, b) => b.totalUtilidad - a.totalUtilidad)
    .slice(0, 5);

  // Gastos por categoría
  const gastosPorCategoria = {};
  gastosFiltrados.forEach(gasto => {
    if (!gastosPorCategoria[gasto.categoria]) {
      gastosPorCategoria[gasto.categoria] = 0;
    }
    gastosPorCategoria[gasto.categoria] += gasto.monto;
  });

  const categoriasGasto = {
    operacion: { nombre: 'Operación', icon: '⚙️', color: '#6366f1' },
    servicios: { nombre: 'Servicios', icon: '💡', color: '#f59e0b' },
    compras: { nombre: 'Compras', icon: '📦', color: '#10b981' },
    nomina: { nombre: 'Nómina', icon: '👥', color: '#8b5cf6' },
    transporte: { nombre: 'Transporte', icon: '🚚', color: '#ec4899' },
    mantenimiento: { nombre: 'Mantenimiento', icon: '🔧', color: '#14b8a6' },
    otros: { nombre: 'Otros', icon: '📋', color: '#64748b' },
  };

  // Saldos pendientes
  const totalSaldoPendiente = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
  const clientesConDeuda = clientes.filter(c => c.saldoPendiente > 0).length;

  // Stock bajo
  const productosStockBajo = productos.filter(p => p.stock <= p.stockMinimo);

  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cantidad);
  };

  const getPeriodoLabel = () => {
    if (periodo === 'hoy') return 'Hoy';
    if (periodo === 'semana') return 'Esta Semana';
    if (periodo === 'mes') return 'Este Mes';
    return 'Todo';
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
              <span className={styles.headerIcon}>📊</span>
              <div>
                <h1>Reportes y Estadísticas</h1>
                <p>Análisis del rendimiento del negocio</p>
              </div>
            </div>
          </div>
          <div className={styles.periodoSelector}>
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
              { id: 'todos', label: 'Todo' },
            ].map(p => (
              <button
                key={p.id}
                className={`${styles.periodoBtn} ${periodo === p.id ? styles.active : ''}`}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Resumen Principal */}
      <section className={styles.resumenPrincipal}>
        <div className={styles.metricaCard}>
          <div className={styles.metricaIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            💰
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValue}>{formatearMoneda(totalVentas)}</span>
            <span className={styles.metricaLabel}>Ventas {getPeriodoLabel()}</span>
          </div>
          <span className={styles.metricaCount}>{ventasFiltradas.length} ventas</span>
        </div>

        <div className={styles.metricaCard}>
          <div className={styles.metricaIcon} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            💸
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValue}>{formatearMoneda(totalGastos)}</span>
            <span className={styles.metricaLabel}>Gastos {getPeriodoLabel()}</span>
          </div>
          <span className={styles.metricaCount}>{gastosFiltrados.length} gastos</span>
        </div>

        <div className={`${styles.metricaCard} ${utilidadBruta >= 0 ? styles.positive : styles.negative}`}>
          <div className={styles.metricaIcon} style={{ background: utilidadBruta >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
            📈
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValue}>{formatearMoneda(utilidadBruta)}</span>
            <span className={styles.metricaLabel}>Utilidad Bruta</span>
          </div>
          <span className={styles.metricaMargen}>{margenUtilidad}% margen</span>
        </div>

        <div className={styles.metricaCard}>
          <div className={styles.metricaIcon} style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
            📥
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValue}>{formatearMoneda(totalAbonos)}</span>
            <span className={styles.metricaLabel}>Abonos Recibidos</span>
          </div>
          <span className={styles.metricaCount}>{abonosFiltrados.length} pagos</span>
        </div>
      </section>

      {/* Grid de Reportes */}
      <div className={styles.reportesGrid}>
        {/* Ventas por Método */}
        <section className={styles.reporteCard}>
          <h3 className={styles.reporteTitulo}>💳 Ventas por Método de Pago</h3>
          <div className={styles.metodosList}>
            <div className={styles.metodoItem}>
              <div className={styles.metodoInfo}>
                <span className={styles.metodoIcon}>💵</span>
                <span className={styles.metodoNombre}>Contado</span>
              </div>
              <div className={styles.metodoStats}>
                <span className={styles.metodoMonto}>{formatearMoneda(totalContado)}</span>
                <span className={styles.metodoCount}>{ventasContado.length} ventas</span>
              </div>
            </div>
            <div className={styles.metodoItem}>
              <div className={styles.metodoInfo}>
                <span className={styles.metodoIcon}>💳</span>
                <span className={styles.metodoNombre}>Crédito</span>
              </div>
              <div className={styles.metodoStats}>
                <span className={styles.metodoMonto}>{formatearMoneda(totalCredito)}</span>
                <span className={styles.metodoCount}>{ventasCredito.length} ventas</span>
              </div>
            </div>
          </div>
          <div className={styles.barraProgreso}>
            <div 
              className={styles.barraContado} 
              style={{ width: totalVentas > 0 ? `${(totalContado / totalVentas) * 100}%` : '50%' }}
            />
          </div>
          <div className={styles.barraLabels}>
            <span>Contado: {totalVentas > 0 ? ((totalContado / totalVentas) * 100).toFixed(0) : 0}%</span>
            <span>Crédito: {totalVentas > 0 ? ((totalCredito / totalVentas) * 100).toFixed(0) : 0}%</span>
          </div>
        </section>

        {/* Top Productos */}
        <section className={styles.reporteCard}>
          <h3 className={styles.reporteTitulo}>🏆 Productos Más Vendidos</h3>
          {topProductos.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No hay ventas en este periodo</p>
            </div>
          ) : (
            <div className={styles.topProductosList}>
              {topProductos.map((producto, index) => (
                <div key={index} className={styles.topProductoItem}>
                  <span className={styles.topRank}>#{index + 1}</span>
                  <div className={styles.topInfo}>
                    <span className={styles.topNombre}>{producto.nombre}</span>
                    <span className={styles.topCantidad}>{producto.cantidad} unidades</span>
                  </div>
                  <span className={styles.topMonto}>{formatearMoneda(producto.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Clientes Rentables */}
        <section className={styles.reporteCard}>
          <h3 className={styles.reporteTitulo}>💎 Mejores Clientes (Por Utilidad)</h3>
          {topClientes.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No hay datos de rentabilidad</p>
            </div>
          ) : (
            <div className={styles.topProductosList}>
              {topClientes.map((cliente, index) => (
                <div key={index} className={styles.topProductoItem}>
                   <span className={styles.topRank} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>#{index + 1}</span>
                   <div className={styles.topInfo}>
                     <span className={styles.topNombre}>{cliente.nombre}</span>
                     <span className={styles.topCantidad}>{cliente.count} compras | Margen: {cliente.totalCompras > 0 ? ((cliente.totalUtilidad / cliente.totalCompras) * 100).toFixed(1) : 0}%</span>
                   </div>
                   <div className={styles.metodoStats}>
                    <span className={styles.topMonto} style={{ color: '#8b5cf6' }}>{formatearMoneda(cliente.totalUtilidad)}</span>
                    <span className={styles.metodoCount} style={{ textAlign: 'right' }}>Ventas: {formatearMoneda(cliente.totalCompras)}</span>
                   </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gastos por Categoría */}
        <section className={styles.reporteCard}>
          <h3 className={styles.reporteTitulo}>📊 Gastos por Categoría</h3>
          {Object.keys(gastosPorCategoria).length === 0 ? (
            <div className={styles.emptyState}>
              <span>📭</span>
              <p>No hay gastos en este periodo</p>
            </div>
          ) : (
            <div className={styles.categoriasList}>
              {Object.entries(gastosPorCategoria).map(([cat, monto]) => {
                const catInfo = categoriasGasto[cat] || categoriasGasto.otros;
                const porcentaje = (monto / totalGastos) * 100;
                return (
                  <div key={cat} className={styles.categoriaItem}>
                    <div className={styles.categoriaInfo}>
                      <span className={styles.categoriaIcon} style={{ background: `${catInfo.color}20`, color: catInfo.color }}>
                        {catInfo.icon}
                      </span>
                      <span className={styles.categoriaNombre}>{catInfo.nombre}</span>
                    </div>
                    <div className={styles.categoriaStats}>
                      <span className={styles.categoriaMonto}>{formatearMoneda(monto)}</span>
                      <span className={styles.categoriaPorcentaje}>{porcentaje.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Alertas */}
        <section className={styles.reporteCard}>
          <h3 className={styles.reporteTitulo}>⚠️ Alertas y Pendientes</h3>
          <div className={styles.alertasList}>
            <div className={styles.alertaItem}>
              <div className={styles.alertaIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                💰
              </div>
              <div className={styles.alertaInfo}>
                <span className={styles.alertaTitulo}>Cuentas por Cobrar</span>
                <span className={styles.alertaDesc}>{clientesConDeuda} clientes con saldo</span>
              </div>
              <span className={styles.alertaMonto}>{formatearMoneda(totalSaldoPendiente)}</span>
            </div>
            <div className={styles.alertaItem}>
              <div className={styles.alertaIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                📦
              </div>
              <div className={styles.alertaInfo}>
                <span className={styles.alertaTitulo}>Stock Bajo</span>
                <span className={styles.alertaDesc}>Productos por reordenar</span>
              </div>
              <span className={styles.alertaCount}>{productosStockBajo.length} productos</span>
            </div>
          </div>
          {productosStockBajo.length > 0 && (
            <div className={styles.stockBajoList}>
              {productosStockBajo.slice(0, 3).map(p => (
                <div key={p.id} className={styles.stockBajoItem}>
                  <span>{p.nombre}</span>
                  <span className={styles.stockBajoQty}>{p.stock} / {p.stockMinimo}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
