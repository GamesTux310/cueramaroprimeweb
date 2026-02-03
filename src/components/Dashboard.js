'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getVentas, getGastos, getClientes, getProductos, getFacturas, getNotas } from '@/lib/storage';
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
    });

    useEffect(() => {
        // Cargar datos del storage
        const ventas = getVentas();
        const gastos = getGastos();
        const clientes = getClientes();
        const productos = getProductos();
        const facturas = getFacturas();
        const notas = getNotas();

        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        // Cálculos Ventas
        const ventasHoyList = ventas.filter(v => new Date(v.fecha).toDateString() === hoy.toDateString());
        const ventasMesList = ventas.filter(v => new Date(v.fecha) >= inicioMes);
        
        // Cálculos Gastos
        const gastosMesList = gastos.filter(g => new Date(g.fecha) >= inicioMes);

        // Cálculos Clientes
        const totalPorCobrar = clientes.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
        const clientesDeudores = clientes.filter(c => c.saldoPendiente > 0).length;

        // Cálculos Stock
        const productosBajoStock = productos.filter(p => p.stock <= p.stockMinimo).length;

        setStats({
            ventasHoy: ventasHoyList.reduce((sum, v) => sum + v.total, 0),
            ventasMes: ventasMesList.reduce((sum, v) => sum + v.total, 0),
            ventasCountHoy: ventasHoyList.length,
            ventasCountMes: ventasMesList.length,
            
            cuentasPorCobrar: totalPorCobrar,
            clientesConDeuda: clientesDeudores,
            
            stockBajo: productosBajoStock,
            
            facturasTotal: facturas.length,
            facturasMonto: facturas.reduce((sum, f) => sum + f.total, 0),
            
            productosTotal: productos.length,
            
            clientesTotal: clientes.length,
            clientesActivos: clientes.filter(c => c.estado === 'activo').length,
            
            gastosMesMonto: gastosMesList.reduce((sum, g) => sum + g.monto, 0),
            gastosMesCount: gastosMesList.length,

            notasTotal: notas.length,
        });

    }, []);

    const modules = [
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
                { value: '8', label: 'Total', type: 'normal' },
                { value: '5', label: 'Activos', type: 'success' }
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
        },
        {
            href: '/ventas',
            icon: '🛒',
            iconClass: 'green',
            title: 'Ventas',
            description: 'Gestionar ventas',
            stats: [
                { value: formatearMoneda(stats.ventasHoy), label: 'Hoy', type: 'success' },
                { value: stats.ventasCountMes, label: 'Mes', type: 'normal' }
            ]
        },
    ];

    const quickActions = [
        { icon: '➕', label: 'Nueva Venta', href: '/ventas' },
        { icon: '👤', label: 'Agregar Cliente', href: '/clientes' },
        { icon: '📦', label: 'Nuevo Producto', href: '/productos' },
        { icon: '💰', label: 'Registrar Abono', href: '/creditos' },
    ];

    const metrics = [
        {
            icon: '💰',
            iconClass: 'green',
            title: 'Ventas del Día',
            value: formatearMoneda(stats.ventasHoy),
            change: `${stats.ventasCountHoy} ventas`,
            changeType: 'positive'
        },
        {
            icon: '📊',
            iconClass: 'blue',
            title: 'Ventas del Mes',
            value: formatearMoneda(stats.ventasMes),
            change: `${stats.ventasCountMes} ventas`,
            changeType: 'positive'
        },
        {
            icon: '⚠️',
            iconClass: 'yellow',
            title: 'Cuentas por Cobrar',
            value: formatearMoneda(stats.cuentasPorCobrar),
            change: `${stats.clientesConDeuda} clientes`,
            changeType: stats.cuentasPorCobrar > 0 ? 'negative' : 'positive'
        },
        {
            icon: '📦',
            iconClass: 'red',
            title: 'Productos Stock Bajo',
            value: stats.stockBajo,
            change: stats.stockBajo > 0 ? 'Requiere atención' : 'Todo en orden',
            changeType: stats.stockBajo > 0 ? 'negative' : 'positive'
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
                    {metrics.map((metric, index) => (
                        <div key={index} className="metric-card">
                            <div className={`metric-card-icon module-card-icon ${metric.iconClass}`}>
                                {metric.icon}
                            </div>
                            <div className="metric-card-content">
                                <h4>{metric.title}</h4>
                                <div className="value">{metric.value}</div>
                                <div className={`change ${metric.changeType}`}>
                                    {metric.changeType === 'positive' && metric.title.includes('Venta') ? '↑' : ''} {metric.change}
                                </div>
                            </div>
                        </div>
                    ))}
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
