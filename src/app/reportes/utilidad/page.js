'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ImageModal from '@/components/ImageModal';
import { getVentas, getLotes, getProductos } from '@/lib/storage';
import styles from './utilidad.module.css';

export default function ReporteUtilidadPage() {
  const [reporteData, setReporteData] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    producto: ''
  });
  const [productos, setProductos] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  
  // Stats
  const [totales, setTotales] = useState({
    ventas: 0,
    costo: 0,
    utilidad: 0
  });

  useEffect(() => {
    const cargarDatos = async () => {
      // Cargar datos iniciales
      setProductos(await getProductos());
      await generarReporte();
    };
    cargarDatos();
  }, [filtros]);

  const generarReporte = async () => {
    const todasVentas = await getVentas();
    const lotesDb = await getLotes(); // Para buscar info extra del lote si hace falta

    // 1. Filtrar ventas por fecha
    const ventasFiltradas = todasVentas.filter(v => {
      const fechaVenta = v.fecha.split('T')[0];
      return fechaVenta >= filtros.fechaInicio && fechaVenta <= filtros.fechaFin;
    });

    // 2. Aplanar datos: Venta -> Producto -> LoteConsumido
    const filas = [];
    let totalVenta = 0;
    let totalCosto = 0;
    let totalUtilidad = 0;

    ventasFiltradas.forEach(venta => {
      venta.productos.forEach(prod => {
        // Filtrar por producto si está seleccionado
        if (filtros.producto && !(prod.nombre || '').toLowerCase().includes(filtros.producto.toLowerCase())) {
          return;
        }

        // Si es un producto "legacy" sin lotesConsumidos (previo a PEPS)
        if (!prod.lotesConsumidos || prod.lotesConsumidos.length === 0) {
           // Caso Legacy (no debería pasar mucho ya)
           return; 
        }

        prod.lotesConsumidos.forEach(loteUso => {
          // Buscar info original del lote para obtener la foto/evidencia
          const loteOriginal = lotesDb.find(l => l.id === loteUso.loteId);
          
          const precioVentaTotal = (prod.precioUnitario * loteUso.cantidadConsumida);
          const utilidadBruta = precioVentaTotal - loteUso.costoTotal;

          totalVenta += precioVentaTotal;
          totalCosto += loteUso.costoTotal;
          totalUtilidad += utilidadBruta;

          filas.push({
            id: `${venta.id}-${prod.productoId}-${loteUso.loteId || 'legacy'}`,
            fecha: venta.fecha,
            producto: prod.nombre,
            cantidad: loteUso.cantidadConsumida,
            loteOrigen: loteUso.loteId ? `Lote #${loteUso.loteId}` : 'Inventario Inicial',
            costoUnitario: loteUso.precioCompra,
            precioVenta: prod.precioUnitario,
            utilidad: utilidadBruta,
            evidencia: loteOriginal?.adjuntoURL || null,
            nota: loteUso.nota
          });
        });
      });
    });

    // Ordenar por fecha descendente
    filas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    setReporteData(filas);
    setTotales({
      ventas: totalVenta,
      costo: totalCosto,
      utilidad: totalUtilidad
    });
  };

  const formatearMoneda = (val) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(val);
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Reporte de Utilidad Real (PEPS)</h1>
          <p>Desglose de ganancias basado en costos reales por lote.</p>
        </div>

        {/* Filtros */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Fecha Inicio</label>
            <input 
              type="date" 
              className={styles.input}
              value={filtros.fechaInicio}
              onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Fecha Fin</label>
            <input 
              type="date" 
              className={styles.input}
              value={filtros.fechaFin}
              onChange={e => setFiltros({...filtros, fechaFin: e.target.value})}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Producto</label>
            <select 
              className={styles.select}
              value={filtros.producto}
              onChange={e => setFiltros({...filtros, producto: e.target.value})}
            >
              <option value="">Todos</option>
              {productos.map(p => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <button 
            className={styles.btnReset}
            onClick={() => setFiltros({
              fechaInicio: new Date().toISOString().split('T')[0],
              fechaFin: new Date().toISOString().split('T')[0],
              producto: ''
            })}
          >
            Hoy
          </button>
        </div>

        {/* Totales */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ventas Totales</span>
            <span className={styles.statValue}>
              {formatearMoneda(totales.ventas)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Costo Real (PEPS)</span>
            <div className={styles.loteInfo}>
              <span className={`${styles.statValue} ${styles.costo}`}>
                {formatearMoneda(totales.costo)}
              </span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Utilidad Bruta Real</span>
            <span className={`${styles.statValue} ${styles.utilidad}`}>
              {formatearMoneda(totales.utilidad)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Margen Real</span>
            <span className={styles.statValue}>
              {totales.ventas > 0 
                ? `${((totales.utilidad / totales.ventas) * 100).toFixed(1)}%` 
                : '0%'}
            </span>
          </div>
        </div>

        {/* Tabla Detallada */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cant. Vendida</th>
                <th>Lote Origen (Costo)</th>
                <th>Precio Venta</th>
                <th>Utilidad</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {reporteData.length > 0 ? (
                reporteData.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      {new Date(row.fecha).toLocaleDateString('es-MX')}
                      <br/>
                      <small style={{color:'#718096'}}>
                        {new Date(row.fecha).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                      </small>
                    </td>
                    <td style={{fontWeight:500}}>{row.producto}</td>
                    <td>{row.cantidad} kg</td>
                    <td>
                      <div className={styles.loteInfo}>
                        <span>{row.loteOrigen}</span>
                        <span className={styles.costo}>Costo: {formatearMoneda(row.costoUnitario)}/kg</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.precio}>{formatearMoneda(row.precioVenta)}/kg</span>
                    </td>
                    <td className={styles.utilidad}>
                      {formatearMoneda(row.utilidad)}
                    </td>
                    <td>
                      {row.evidencia ? (
                        <button 
                          className={styles.btnEvidence}
                          onClick={() => setModalImage(row.evidencia)}
                        >
                          📄 Ver Factura
                        </button>
                      ) : (
                        <span style={{color: '#cbd5e0'}}>Sin foto</span>
                      )}
                      {row.nota && <div className={styles.warning}>{row.nota}</div>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', padding: '3rem', color: '#718096'}}>
                    No hay ventas registradas en este periodo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {modalImage && (
        <ImageModal 
          src={modalImage} 
          onClose={() => setModalImage(null)} 
        />
      )}
    </div>
  );
}
