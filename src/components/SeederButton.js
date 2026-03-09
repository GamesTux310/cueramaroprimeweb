"use client";

import { useState } from 'react';
import { seedDatabase } from '@/lib/seeder';

export default function SeederButton() {
  const [loading, setLoading] = useState(false);

  // Solo mostrar en modo desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleSeed = async () => {
    if (confirm("⚠️ ¿Estás seguro de inyectar datos falsos? Esto agregará proveedores, productos, compras y ventas.")) {
      setLoading(true);
      try {
        await seedDatabase();
        alert("✅ Base de datos poblada exitosamente. Recarga la página para ver los cambios.");
        window.location.reload();
      } catch (error) {
        console.error("Error en seeder:", error);
        alert("❌ Hubo un error al correr el seeder.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '50px',
        height: '50px',
        borderRadius: '25px',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        zIndex: 9999,
        opacity: loading ? 0.7 : 1,
        transition: 'transform 0.2s',
      }}
      title="Inyectar Datos (Solo Dev)"
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {loading ? '⏳' : '🧪'}
    </button>
  );
}
