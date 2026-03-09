'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getVentas, getGastos, getClientes, getProductos, getFacturas, getNotas, getProveedores } from '@/lib/storage';
import { formatearMoneda } from '@/lib/numberToText';

export default function Dashboard() {
    const [stats, setStats] = useState({
        ventasHoy: 0,
        ventasMes: 0,
        ventasCountHoy: 0,
        ventasCountMes: 0,
        cuentasPorCobrar: 0,
        clientesConDeuda: 0,
        stockBajo: 0,
        
        facturasTotal: 0,
        facturasMonto: 0,
        
        productosTotal: 0,
        
        clientesTotal: 0,
        clientesActivos: 0,
        
        gastosMesMonto: 0,
        gastosMesCount: 0,

        notasTotal: 0, 

        proveedoresTotal: 0,
        proveedoresActivos: 0,
    });

    useEffect(() => {
        const loadData = async () => {
            // Cargar datos del storage asíncronamente
            const ventas = await getVentas();
            const gastos = await getGastos();
            const clientes = await getClientes();
            const productos = await getProductos();
            const facturas = await getFacturas();
            const notas = await getNotas();
            const proveedores = await getProveedores();

        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        // Inicio semana (Lunes)
        const diaSemana = hoy.getDay() || 7; 
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diaSemana + 1);
        inicioSemana.setHours(0,0,0,0);

        // Cálculos Ventas
        const ventasHoyList = ventas.filter(v => new Date(v.fecha).toDateString() === hoy.toDateString());
        const ventasSemanaList = ventas.filter(v => new Date(v.fecha) >= inicioSemana);
        const ventasMesList = ventas.filter(v => new Date(v.fecha) >= inicioMes);
        
        // Cálculos Gastos
        const gastosMesList = gastos.filter(g => new Date(g.fecha) >= inicioMes);
        const gastosHoyList = gastos.filter(g => new Date(g.fecha).toDateString() === hoy.toDateString());

        // Cálculos Clientes
        const totalPorCobrar = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
        const clientesDeudores = clientes.filter(c => c.saldoPendiente > 0).length;

        // Cálculos Proveedores
        const totalDeudaProveedores = proveedores.reduce((sum, p) => sum + (p.saldoPendiente || 0), 0);
        const proveedoresConDeuda = proveedores.filter(p => p.saldoPendiente > 0).length;

        // Cálculos Stock
        const productosBajoStock = productos.filter(p => p.stock <= p.stockMinimo).length;

        setStats({
            ventasHoy: ventasHoyList.reduce((sum, v) => sum + v.total, 0),
            ventasSemana: ventasSemanaList.reduce((sum, v) => sum + v.total, 0),
            ventasMes: ventasMesList.reduce((sum, v) => sum + v.total, 0),
            ventasCountHoy: ventasHoyList.length,
            ventasCountSemana: ventasSemanaList.length,
            ventasCountMes: ventasMesList.length,
            
            cuentasPorCobrar: totalPorCobrar,
            clientesConDeuda: clientesDeudores,

            deudaProveedores: totalDeudaProveedores,
            proveedoresConDeuda: proveedoresConDeuda,
            
            stockBajo: productosBajoStock,
            
            facturasTotal: facturas.length,
            facturasMonto: facturas.reduce((sum, f) => sum + f.total, 0),
            
            productosTotal: productos.length,
            
            clientesTotal: clientes.length,
            clientesActivos: clientes.filter(c => c.estado === 'activo').length,
            
            gastosMesMonto: gastosMesList.reduce((sum, g) => sum + g.monto, 0),
            gastosMesCount: gastosMesList.length,
            
            gastosHoyMonto: gastosHoyList.reduce((sum, g) => sum + g.monto, 0),
            gastosHoyCount: gastosHoyList.length,

            notasTotal: notas.length,

            proveedoresTotal: proveedores.length,
            proveedoresActivos: proveedores.filter(p => p.estado === 'activo').length,
        });
        };
        
        loadData();
    }, []);

    const modules = [
        {
            href: '/ventas',
            icon: '🛒',
            iconClass: 'green',
            title: 'Ventas',
            description: 'Historial y registros',
            stats: [
                { value: formatearMoneda(stats.ventasMes), label: 'Mes', type: 'success' },
                { value: stats.ventasCountMes, label: 'Oper.', type: 'normal' }
            ]
        },
        {
            href: '/facturas',
            icon: '📄',
            iconClass: 'blue',
            title: 'Facturas',
            description: 'Gestión de facturas',
            stats: [
                { value: stats.facturasTotal, label: 'Total', type: 'normal' },
                { value: formatearMoneda(stats.facturasMonto), label: 'Monto', type: 'success' }
            ]
        },
        {
            href: '/productos',
            icon: '📦',
            iconClass: 'green',
            title: 'Productos',
            description: 'Administrar inventario',
            stats: [
                { value: stats.productosTotal, label: 'Total', type: 'normal' },
                { value: stats.stockBajo, label: 'Stock Bajo', type: stats.stockBajo > 0 ? 'warning' : 'success' }
            ]
        },
        {
            href: '/clientes',
            icon: '👥',
            iconClass: 'blue',
            title: 'Clientes',
            description: 'Base de datos de clientes',
            stats: [
                { value: stats.clientesTotal, label: 'Total', type: 'normal' },
                { value: stats.clientesActivos, label: 'Activos', type: 'success' }
            ]
        },
        {
            href: '/proveedores',
            icon: '🚚',
            iconClass: 'purple',
            title: 'Proveedores',
            description: 'Gestionar proveedores',
            stats: [
                { value: stats.proveedoresTotal, label: 'Total', type: 'normal' },
                { value: stats.proveedoresActivos, label: 'Activos', type: 'success' }
            ]
        },
        {
            href: '/gastos',
            icon: '💸',
            iconClass: 'red',
            title: 'Gastos',
            description: 'Control de gastos',
            stats: [
                { value: formatearMoneda(stats.gastosMesMonto), label: 'Mes', type: 'danger' },
                { value: stats.gastosMesCount, label: 'Total', type: 'normal' }
            ]
        },
    ];

    const secondaryModules = [
        {
            href: '/reportes',
            icon: '📈',
            iconClass: 'purple',
            title: 'Reportes',
            description: 'Análisis y reportes',
            stats: [
                { value: 'Disponible', label: 'Análisis', type: 'normal' },
                { value: 'Activos', label: 'Gráficos', type: 'success' }
            ]
        },
        {
            href: '/notas',
            icon: '📝',
            iconClass: 'yellow',
            title: 'Notas',
            description: 'Gestión de notas',
            stats: [
                { value: stats.notasTotal, label: 'Total', type: 'normal' },
                { value: 'Active', label: 'Estado', type: 'success' }
            ]
        }
    ];

    const quickActions = [
        { icon: '➕', label: 'Nueva Venta', href: '/ventas' },
        { icon: '👤', label: 'Agregar Cliente', href: '/clientes' },
        { icon: '📦', label: 'Nuevo Producto', href: '/productos' },
        { icon: '💰', label: 'Registrar Abono', href: '/creditos' },
    ];

    const [filtroVentas, setFiltroVentas] = useState('hoy');

    const metrics = [
        {
            icon: '💰',
            iconClass: 'green',
            title: 'Ventas Totales',
            value: formatearMoneda(filtroVentas === 'hoy' ? stats.ventasHoy : filtroVentas === 'semana' ? stats.ventasSemana : stats.ventasMes),
            change: `${filtroVentas === 'hoy' ? stats.ventasCountHoy : filtroVentas === 'semana' ? stats.ventasCountSemana : stats.ventasCountMes} ventas`,
            changeType: 'positive',
            hasFilter: true,
            onFilterChange: setFiltroVentas,
            currentFilter: filtroVentas,
            href: '/ventas'
        },
        {
            icon: '💸',
            iconClass: 'red',
            title: 'Gastos del Día',
            value: formatearMoneda(stats.gastosHoyMonto || 0),
            change: `${stats.gastosHoyCount || 0} gastos`,
            changeType: 'negative',
            href: '/gastos'
        },
        {
            icon: '⚠️',
            iconClass: 'yellow',
            title: 'Cuentas por Cobrar',
            value: formatearMoneda(stats.cuentasPorCobrar),
            change: `${stats.clientesConDeuda} clientes`,
            changeType: stats.cuentasPorCobrar > 0 ? 'negative' : 'positive',
            href: '/creditos'
        },
        {
            icon: '🚚',
            iconClass: 'purple',
            title: 'Deuda a Proveedores',
            value: formatearMoneda(stats.deudaProveedores || 0),
            change: `${stats.proveedoresConDeuda || 0} proveedores`,
            changeType: stats.deudaProveedores > 0 ? 'negative' : 'positive',
            href: '/proveedores'
        },
        {
            icon: '📦',
            iconClass: 'red',
            title: 'Productos Stock Bajo',
            value: stats.stockBajo,
            changeType: stats.stockBajo > 0 ? 'negative' : 'positive',
            href: '/productos'
        },
    ];

    return (
        <main className="main-content">
            {/* Header */}
            <header className="page-header">
                <div className="logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <img 
                        src="/logo.png" 
                        alt="Cueramaro Prime Logo" 
                        style={{ width: '120px', height: 'auto' }}
                    />

                </div>
                <p style={{ marginTop: '24px', display: 'inline-block' }}>Lo único imposible es aquello que no intentas</p>
            </header>

            {/* Quick Actions */}
            <section className="dashboard-section">
                <div className="quick-actions">
                    {quickActions.map((action, index) => (
                        <Link key={index} href={action.href} className="quick-action-btn">
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Metrics */}
            <section className="dashboard-section">
                <div className="section-header">
                    <div className="section-title">
                        <h2>Resumen del Día</h2>
                        <p>Métricas principales de tu negocio</p>
                    </div>
                </div>
                <div className="cards-grid cards-grid-lg">
                    {metrics.map((metric, index) => {
                        const CardWrapper = metric.href ? Link : 'div';
                        const CardProps = metric.href ? { href: metric.href, style: { textDecoration: 'none', color: 'inherit' } } : {};

                        return (
                            <CardWrapper key={index} {...CardProps} className="metric-card" style={metric.href ? { cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-4px)' } } : {}}>
                                <div className={`metric-card-icon module-card-icon ${metric.iconClass}`}>
                                    {metric.icon}
                                </div>
                                <div className="metric-card-content" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <h4>{metric.title}</h4>
                                        {metric.hasFilter && (
                                            <select 
                                                value={metric.currentFilter}
                                                onChange={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    metric.onFilterChange(e.target.value);
                                                }}
                                                style={{
                                                    fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px',
                                                    border: '1px solid #d1d5db', background: 'white', color: '#374151',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="hoy">Hoy</option>
                                                <option value="semana">Semana</option>
                                                <option value="mes">Mes</option>
                                            </select>
                                        )}
                                    </div>
                                    <div className="value">{metric.value}</div>
                                    <div className={`change ${metric.changeType}`}>
                                        {metric.changeType === 'positive' && metric.title.includes('Venta') ? '↑' : ''} {metric.change}
                                    </div>
                                </div>
                            </CardWrapper>
                        );
                    })}
                </div>
            </section>

            {/* Panel de Control */}
            <section className="dashboard-section">
                <div className="section-header">
                    <div className="section-title">
                        <h2>Panel de Control</h2>
                        <p>Gestiona tu negocio desde un solo lugar</p>
                    </div>
                </div>
                <div className="cards-grid">
                    {modules.map((module, index) => (
                        <Link key={index} href={module.href} className="module-card">
                            <div className="module-card-header">
                                <div className={`module-card-icon ${module.iconClass}`}>
                                    {module.icon}
                                </div>
                                <div className="module-card-info">
                                    <h3>{module.title}</h3>
                                    <p>{module.description}</p>
                                </div>
                            </div>
                            <div className="module-card-stats">
                                {module.stats.map((stat, statIndex) => (
                                    <div key={statIndex} className="stat-item">
                                        <span className={`stat-value ${stat.type}`}>{stat.value}</span>
                                        <span className="stat-label">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Módulos Secundarios */}
            <section className="dashboard-section">
                <div className="cards-grid">
                    {secondaryModules.map((module, index) => (
                        <Link key={index} href={module.href} className="module-card">
                            <div className="module-card-header">
                                <div className={`module-card-icon ${module.iconClass}`}>
                                    {module.icon}
                                </div>
                                <div className="module-card-info">
                                    <h3>{module.title}</h3>
                                    <p>{module.description}</p>
                                </div>
                            </div>
                            <div className="module-card-stats">
                                {module.stats.map((stat, statIndex) => (
                                    <div key={statIndex} className="stat-item">
                                        <span className={`stat-value ${stat.type}`}>{stat.value}</span>
                                        <span className="stat-label">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}
