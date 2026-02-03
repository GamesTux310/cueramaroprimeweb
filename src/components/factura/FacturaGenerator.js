'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

// Estilos CSS completos para la factura (embebidos para impresión)
const facturaStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #333;
    background: white;
  }
  
  .factura-container {
    width: 720px;
    min-height: 980px;
    background: white;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #333;
    padding: 20px 25px;
    box-sizing: border-box;
    margin: 0 auto;
  }
  
  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 15px;
  }
  
  .empresa-info {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    flex: 1;
  }
  
  .logo-container {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .logo {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .empresa-nombre {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin: 0 0 3px 0;
  }
  
  .empresa-direccion,
  .empresa-colonia,
  .empresa-cp {
    margin: 2px 0;
    font-size: 11px;
    color: #555;
  }
  
  /* Nota de Crédito Panel */
  .nota-credito-panel {
    width: 280px;
    border: 1px solid #ccc;
  }
  
  .nota-credito-titulo {
    background-color: #F7941D;
    color: white;
    font-weight: bold;
    font-size: 14px;
    text-align: center;
    padding: 8px;
  }
  
  .nota-credito-info {
    background-color: #E8F4FD;
    padding: 8px;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px solid #d0e8f8;
  }
  
  .info-row:last-child {
    border-bottom: none;
  }
  
  .info-label {
    font-weight: bold;
    font-size: 9px;
    color: #333;
  }
  
  .info-value {
    font-size: 9px;
    color: #333;
    text-align: right;
  }
  
  /* Cliente Section */
  .cliente-section {
    display: flex;
    margin-bottom: 10px;
    border: 1px solid #ccc;
  }
  
  .cliente-titulo {
    background-color: #7DB3DD;
    color: white;
    font-weight: bold;
    font-size: 8px;
    padding: 5px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.1;
    min-width: 18px;
  }
  
  .cliente-grid {
    flex: 1;
    padding: 8px;
    background-color: #E8F4FD;
  }
  
  .cliente-row {
    display: flex;
    padding: 3px 0;
    border-bottom: 1px solid #d0e8f8;
  }
  
  .cliente-row:last-child {
    border-bottom: none;
  }
  
  .cliente-label {
    width: 80px;
    font-weight: bold;
    font-size: 9px;
    color: #333;
  }
  
  .cliente-value {
    flex: 1;
    font-size: 9px;
    color: #333;
    border-bottom: 1px solid #999;
    min-height: 14px;
  }
  
  .vendedor-info {
    width: 180px;
    padding: 8px;
    background-color: #E8F4FD;
    border-left: 1px solid #ccc;
  }
  
  .vendedor-row {
    display: flex;
    padding: 3px 0;
    border-bottom: 1px solid #d0e8f8;
  }
  
  .vendedor-label {
    width: 70px;
    font-weight: bold;
    font-size: 9px;
    color: #333;
  }
  
  .vendedor-value {
    flex: 1;
    font-size: 9px;
    color: #333;
  }
  
  /* Tabla de Productos */
  .productos-section {
    margin-bottom: 8px;
  }
  
  .productos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  
  .productos-table thead tr {
    background-color: #7DB3DD;
    color: white;
  }
  
  .productos-table th {
    padding: 5px 4px;
    font-weight: bold;
    text-align: center;
    border: 1px solid #5a9bc9;
    font-size: 9px;
  }
  
  .productos-table td {
    padding: 4px 4px;
    border: 1px solid #ccc;
    min-height: 16px;
    font-size: 9px;
  }
  
  .td-centro { text-align: center; }
  .td-derecha { text-align: right; }
  .td-descripcion { text-align: left; }
  
  .productos-table tbody tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  /* Totales */
  .totales-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  
  .importe-letra {
    flex: 1;
    padding-right: 20px;
  }
  
  .importe-letra-label {
    font-weight: bold;
    font-size: 10px;
    margin-bottom: 5px;
  }
  
  .importe-letra-texto {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  
  .con-letra {
    font-weight: bold;
    font-size: 9px;
    white-space: nowrap;
  }
  
  .letra-valor {
    font-size: 9px;
    color: #333;
    border-bottom: 1px solid #999;
    flex: 1;
    min-height: 14px;
  }
  
  .totales-box {
    width: 180px;
    border: 1px solid #ccc;
  }
  
  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid #ccc;
    background-color: #E8F4FD;
  }
  
  .total-row:last-child {
    border-bottom: none;
    background-color: #7DB3DD;
    color: white;
    font-weight: bold;
  }
  
  .total-label, .total-value {
    font-size: 10px;
    font-weight: bold;
  }
  
  /* Pagaré */
  .pagare-section {
    display: flex;
    gap: 15px;
    border: 2px solid #333;
    padding: 12px;
    margin-top: 15px;
    background-color: #fafafa;
  }
  
  .qr-container {
    width: 100px;
    height: 100px;
  }
  
  .qr-code {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .pagare-content {
    flex: 1;
  }
  
  .pagare-titulo {
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 10px 0;
    color: #333;
  }
  
  .pagare-texto {
    font-size: 10px;
    margin: 0 0 10px 0;
    color: #333;
  }
  
  .pagare-texto-legal {
    font-size: 9px;
    margin: 0 0 15px 0;
    color: #555;
    line-height: 1.4;
  }
  
  .bueno-por {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .bueno-por-label {
    font-weight: bold;
    font-size: 11px;
  }
  
  .bueno-por-value {
    font-size: 14px;
    font-weight: bold;
    color: #333;
    border: 1px solid #333;
    padding: 5px 15px;
    min-width: 100px;
    text-align: right;
  }
  
  .firma-section {
    text-align: center;
    margin-top: 15px;
  }
  
  .firma-linea {
    width: 200px;
    border-bottom: 1px solid #333;
    margin: 0 auto 5px auto;
  }
  
  .firma-texto {
    font-size: 9px;
    color: #555;
    margin: 0;
  }
  
  /* Mensaje Legal */
  .mensaje-legal {
    text-align: center;
    font-size: 8px;
    color: #666;
    padding: 8px 10px;
    margin-top: 10px;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-style: italic;
  }
  
  @media print {
    body { margin: 0; padding: 0; }
    .factura-container {
      width: 100%;
      padding: 15px;
      margin: 0;
    }
  }
`;

export async function generarFacturaPDF(elementId, nombreArchivo = 'factura') {
  try {
    const element = document.getElementById(elementId);
    
    if (!element) {
      throw new Error('Elemento de factura no encontrado');
    }

    // Limpiar nombre de archivo (quitar caracteres no válidos)
    const nombreLimpio = nombreArchivo
      .replace(/[<>:"/\\|?*]/g, '-') // Reemplazar caracteres no válidos
      .trim() || 'factura';
    
    console.log('📄 Generando PDF con nombre:', nombreLimpio);

    // Configuración de html2canvas para máxima calidad
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    // Crear PDF tamaño carta
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calcular dimensiones manteniendo proporción
    const imgRatio = canvas.width / canvas.height;
    const pdfRatio = pdfWidth / pdfHeight;

    let finalWidth, finalHeight, offsetX = 0, offsetY = 0;

    if (imgRatio > pdfRatio) {
      finalWidth = pdfWidth - 10; // Margen
      finalHeight = finalWidth / imgRatio;
      offsetX = 5;
      offsetY = 5;
    } else {
      finalHeight = pdfHeight - 10;
      finalWidth = finalHeight * imgRatio;
      offsetX = (pdfWidth - finalWidth) / 2;
      offsetY = 5;
    }

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
    
    // Usar file-saver para garantizar el nombre correcto del archivo
    const pdfBlob = pdf.output('blob');
    saveAs(pdfBlob, `${nombreLimpio}.pdf`);

    return { success: true, mensaje: 'PDF generado exitosamente' };
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return { success: false, error: error.message };
  }
}

export async function imprimirFactura(elementId, nombreArchivo = 'Factura') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Elemento de factura no encontrado');
    return;
  }

  // Clonar el elemento y convertir clases CSS module a clases normales
  const clone = element.cloneNode(true);
  
  // Función para convertir clases hasheadas a nombres simples
  const convertirClases = (el) => {
    if (el.className && typeof el.className === 'string') {
      // Las clases de CSS modules tienen formato: NombreClase_hash__xxxxx
      // Las convertimos a kebab-case para los estilos embebidos
      const clasesOriginales = el.className.split(' ');
      const clasesNuevas = clasesOriginales.map(clase => {
        // Extraer el nombre base de la clase (antes del primer _)
        const match = clase.match(/^([a-zA-Z]+)/);
        if (match) {
          // Convertir camelCase a kebab-case
          return match[1].replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
        }
        return clase;
      });
      el.className = clasesNuevas.join(' ');
    }
    
    // Procesar hijos recursivamente
    Array.from(el.children).forEach(child => convertirClases(child));
  };
  
  convertirClases(clone);
  clone.className = 'factura-container';

  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${nombreArchivo}</title>
        <style>${facturaStyles}</style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  
  // Esperar a que las imágenes carguen
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
}
