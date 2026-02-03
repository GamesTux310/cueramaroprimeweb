'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { 
      section: 'Principal',
      items: [
        { href: '/', icon: '🏠', label: 'Dashboard' },
        { href: '/notas', icon: '📝', label: 'Notas' },
      ]
    },
    {
      section: 'Gestión',
      items: [
        { href: '/ventas', icon: '🛒', label: 'Ventas', badge: null },
        { href: '/productos', icon: '📦', label: 'Productos' },
        { href: '/clientes', icon: '👥', label: 'Clientes' },
        { href: '/proveedores', icon: '🚚', label: 'Proveedores' },
      ]
    },
    {
      section: 'Finanzas',
      items: [
        { href: '/creditos', icon: '💳', label: 'Créditos', badge: 3 },
        { href: '/gastos', icon: '💸', label: 'Gastos' },
        { href: '/finanzas', icon: '📊', label: 'Panel Financiero' },
      ]
    },
    {
      section: 'Documentos',
      items: [
        { href: '/reportes', icon: '📈', label: 'Reportes' },
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
