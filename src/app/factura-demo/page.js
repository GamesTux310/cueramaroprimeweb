'use client';

import React, { useState } from 'react';
import FacturaTemplate from '@/components/factura/FacturaTemplate';
import FacturaPreview from '@/components/factura/FacturaPreview';

export default function FacturaDemoPage() {
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Datos de ejemplo para la factura
  const facturaDemo = {
    numeroFactura: 'F-2026-001',
    fechaEmision: '31 DE ENERO DE 2026',
    fechaVencimiento: '28 DE FEBRERO DE 2026',
    expedidaEn: 'CUERÁMARO, GUANAJUATO',
    metodoPago: 'TRANSFERENCIA/EFECTIVO/DEPÓSITO',
    plazoPago: '30 DÍAS',
    vendedor: 'OSCAR PANTOJA',
    cliente: {
      codigo: 'CLI-001',
      nombre: 'JUAN PÉREZ GARCÍA',
      direccion: 'AV. PRINCIPAL #123, COL. CENTRO',
      cp: '36960',
      rfc: 'PEGJ850101ABC',
      telefono: '461 123 4567'
    },
    productos: [
      { cantidad: 5, codigo: 'CARNE-001', unidad: 'KG', descripcion: 'BISTEC DE RES', precioUnitario: 189.00 },
      { cantidad: 3, codigo: 'CARNE-002', unidad: 'KG', descripcion: 'CHULETA DE CERDO', precioUnitario: 149.00 },
      { cantidad: 2, codigo: 'CARNE-003', unidad: 'KG', descripcion: 'POLLO ENTERO', precioUnitario: 79.00 },
    ],
    subtotal: 0,
    iva: 0,
    total: 0,
    buenoFor: 0
  };

  // Calcular totales
  const subtotal = facturaDemo.productos.reduce((sum, p) => sum + (p.cantidad * p.precioUnitario), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  facturaDemo.subtotal = subtotal;
  facturaDemo.iva = iva;
  facturaDemo.total = total;
  facturaDemo.buenoFor = total;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto', 
        textAlign: 'center',
        color: 'white',
        marginBottom: '20px'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>📄 Demo: Template de Factura Local</h1>
        <p style={{ opacity: 0.8, marginBottom: '20px' }}>
          Vista previa del diseño idéntico a la plantilla "Nota Crédito"
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => setMostrarPreview(true)}
            style={{
              background: 'linear-gradient(135deg, #F7941D, #e07e0c)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📥 Abrir Modal de Descarga
          </button>
        </div>
      </div>

      {/* Vista directa del template */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '12px',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <FacturaTemplate factura={facturaDemo} />
      </div>

      {/* Modal de preview */}
      {mostrarPreview && (
        <FacturaPreview 
          factura={facturaDemo}
          onClose={() => setMostrarPreview(false)}
          onFacturaGuardada={(f) => console.log('Factura guardada:', f)}
        />
      )}
    </div>
  );
}
