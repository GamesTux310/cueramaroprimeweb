'use client';

import React, { useState } from 'react';
import FacturaTemplate from './FacturaTemplate';
import { generarFacturaPDF, imprimirFactura } from './FacturaGenerator';
import styles from './FacturaPreview.module.css';

export default function FacturaPreview({ factura, onClose, onFacturaGuardada }) {
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleDescargarPDF = async () => {
    setGenerando(true);
    setMensaje('Generando PDF...');

    try {
      const resultado = await generarFacturaPDF(
        'factura-template',
        factura.numeroFactura || 'factura'
      );

      if (resultado.success) {
        setMensaje('✅ PDF descargado exitosamente');
        
        // Guardar en historial local
        guardarEnHistorial(factura);
        
        if (onFacturaGuardada) {
          onFacturaGuardada(factura);
        }
      } else {
        setMensaje('❌ Error: ' + resultado.error);
      }
    } catch (error) {
      setMensaje('❌ Error al generar PDF');
    }

    setGenerando(false);
  };

  const handleImprimir = () => {
    imprimirFactura('factura-template', factura.numeroFactura || 'Factura');
  };

  const guardarEnHistorial = (factura) => {
    try {
      const historial = JSON.parse(localStorage.getItem('historialFacturas') || '[]');
      const nuevaFactura = {
        ...factura,
        fechaGeneracion: new Date().toISOString(),
        id: Date.now()
      };
      historial.unshift(nuevaFactura);
      localStorage.setItem('historialFacturas', JSON.stringify(historial));
      
      // Actualizar contador de folios
      const ultimoFolio = parseInt(factura.numeroFactura?.split('-').pop() || '0');
      const contadorActual = parseInt(localStorage.getItem('contadorFolios') || '0');
      if (ultimoFolio > contadorActual) {
        localStorage.setItem('contadorFolios', ultimoFolio.toString());
      }
    } catch (error) {
      console.error('Error al guardar en historial:', error);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Vista Previa de Factura</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.previewContainer}>
          <FacturaTemplate factura={factura} />
        </div>

        <div className={styles.actions}>
          {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
          
          <button 
            onClick={handleDescargarPDF} 
            className={styles.btnPrimary}
            disabled={generando}
          >
            {generando ? '⏳ Generando...' : '📥 Descargar PDF'}
          </button>
          
          <button 
            onClick={onClose} 
            className={styles.btnCancel}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
