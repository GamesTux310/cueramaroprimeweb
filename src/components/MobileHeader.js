'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileHeader.module.css';

// Mapa de rutas a títulos e iconos
const routeInfo = {
  '/': { title: 'Dashboard', icon: '🏠' },
  '/notas': { title: 'Notas', icon: '📝' },
  '/ventas': { title: 'Ventas', icon: '🛒' },
  '/productos': { title: 'Productos', icon: '📦' },
  '/clientes': { title: 'Clientes', icon: '👥' },
  '/proveedores': { title: 'Proveedores', icon: '🚚' },
  '/creditos': { title: 'Créditos', icon: '💳' },
  '/gastos': { title: 'Gastos', icon: '💸' },
  '/finanzas': { title: 'Panel Financiero', icon: '📊' },
  '/reportes': { title: 'Reportes', icon: '📈' },
  '/configuracion': { title: 'Configuración', icon: '⚙️' },
  '/factura-demo': { title: 'Factura Demo', icon: '🧾' },
};

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
      { href: '/ventas', icon: '🛒', label: 'Ventas' },
      { href: '/productos', icon: '📦', label: 'Productos' },
      { href: '/clientes', icon: '👥', label: 'Clientes' },
      { href: '/proveedores', icon: '🚚', label: 'Proveedores' },
    ]
  },
  {
    section: 'Finanzas',
    items: [
      { href: '/creditos', icon: '💳', label: 'Créditos' },
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

export default function MobileHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Cerrar menú cuando cambia la ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevenir scroll cuando el menú está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const currentRoute = routeInfo[pathname] || { title: 'Cuerámaro Prime', icon: '📦' };

  return (
    <>
      {/* Header Móvil */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.menuButton}
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <span className={styles.hamburger}></span>
          <span className={styles.hamburger}></span>
          <span className={styles.hamburger}></span>
        </button>
        
        <div className={styles.headerTitle}>
          <span className={styles.headerIcon}>{currentRoute.icon}</span>
          <h1>{currentRoute.title}</h1>
        </div>
        
        <div className={styles.headerSpacer}></div>
      </header>

      {/* Overlay del menú */}
      {menuOpen && (
        <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
      )}

      {/* Menú deslizante */}
      <nav className={`${styles.slideMenu} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.menuHeader}>
          <img 
            src="/logotipo_letras.png" 
            alt="Cuerámaro Prime"
            className={styles.menuLogo}
          />
          <button 
            className={styles.closeButton}
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <div className={styles.menuContent}>
          {menuItems.map((section, sectionIndex) => (
            <div key={sectionIndex} className={styles.menuSection}>
              <div className={styles.menuSectionTitle}>{section.section}</div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.menuItem} ${pathname === item.href ? styles.active : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className={styles.menuItemIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
