'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getClientes } from '@/lib/storage';

export default function Sidebar() {
  const pathname = usePathname();
  const [pendientesCount, setPendientesCount] = useState(0);

  useEffect(() => {
    const fetchPendientes = async () => {
      try {
        const clientes = await getClientes();
        const deudores = clientes.filter(c => c.saldoPendiente > 0);
        setPendientesCount(deudores.length);
      } catch (e) {
        console.error("Error cargando deudores para badge", e);
      }
    };
    
    // Ejecutar al montar
    fetchPendientes();
    
    // Actualizar periódicamente cada 10 segundos en caso de cambios en otras pestañas
    const intervalId = setInterval(fetchPendientes, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const menuItems = [
    { 
      section: 'Principal',
      items: [
        { href: '/', icon: '🏠', label: 'Dashboard' },
        { href: '/calendario', icon: '📅', label: 'Calendario' },
        { href: '/notas', icon: '📝', label: 'Notas' },
      ]
    },
    {
      section: 'Gestión',
      items: [
        { href: '/ventas', icon: '🛒', label: 'Hacer una Venta', badge: null },
        { href: '/productos', icon: '📦', label: 'Gestionar Inventario' },
        { href: '/clientes', icon: '👥', label: 'Directorio de Clientes' },
        { href: '/proveedores', icon: '🚚', label: 'Proveedores' },
        { href: '/facturas', icon: '📄', label: 'Ver Historial de Facturas' }, // 🆕 Enviado aquí por solicitud
      ]
    },
    {
      section: 'Finanzas',
      items: [
        { href: '/creditos', icon: '💳', label: 'Cobrar un Crédito', badge: pendientesCount > 0 ? pendientesCount : null },
        { href: '/gastos', icon: '💸', label: 'Gastos' },
        { href: '/finanzas', icon: '📊', label: 'Panel Financiero' },
      ]
    },
    {
      section: 'Documentos',
      items: [
        { href: '/reportes', icon: '📈', label: 'Reportes' },
      ]
    },
    {
      section: 'Sistema',
      items: [
        { href: '/configuracion', icon: '⚙️', label: 'Configuración' },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ justifyContent: 'center', padding: '0' }}>
        <img 
          src="/logotipo_letras.png" 
          alt="Cuerámaro Prime"
          style={{ 
            maxWidth: '100%', 
            height: 'auto', 
            maxHeight: '80px',
            objectFit: 'contain'
          }}
        />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
