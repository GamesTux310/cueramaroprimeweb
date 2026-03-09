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
  
  @page {
    size: letter;
    margin: 0;
  }

  .factura-container {
    width: 200mm;
    max-width: 200mm;
    min-height: 279.4mm;
    background: white;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #333;
    padding: 15mm;
    box-sizing: border-box;
    margin: 0 auto;
    text-transform: uppercase;
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
    margin-top: 80px; /* Mucho más espacio para que no se raye el contenido al firmar */
    padding-top: 30px;
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
    font-size: 9px;
    color: #666;
    padding: 10px 15px;
    margin-top: 10px;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-style: italic;
    width: 100%;
    box-sizing: border-box;
    word-wrap: break-word;
    line-height: 1.4;
  }
  
  @media print {
    body { 
      margin: 0; 
      padding: 0;
      /* Escalar el contenido para que encaje mejor en la hoja nativa del navegador */
      width: 100%;
    }
    .factura-container {
      width: 100%;
      max-width: 100%;
      padding: 5mm; /* Menor margen para que quepa la información de los productos */
      margin: 0;
      box-shadow: none;
      border: none;
      /* Asegurarse de que el render final se adapte en el área imprimible interior de la hoja */
      transform: scale(0.95);
      transform-origin: top left;
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

    // Estrategia anti-recorte y centrado perfecto: clonamos el elemento fuera del contenedor con scroll
    const clone = element.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '0'; 
    clone.style.left = '0'; 
    clone.style.margin = '0'; // Eliminamos márgenes externos que causan bordes blancos asimétricos
    clone.style.width = '215.9mm'; // Forzar el ancho exacto de una hoja tamaño carta
    clone.style.minHeight = '279.4mm'; // Forzar el alto de una hoja tamaño carta
    clone.style.zIndex = '-9999'; 
    clone.style.overflow = 'visible';
    document.body.appendChild(clone);

    // Esperar a que el navegador aplique los estilos forzados al clon
    await new Promise(resolve => setTimeout(resolve, 50));

    // Configuración de html2canvas para máxima calidad
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Instruimos a html2canvas a tomar el tamaño natural exacto del clon renderizado
      width: clone.offsetWidth,
      height: clone.offsetHeight
    });

    // Limpiar el clon del DOM
    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/png', 1.0);

    // Inicializar PDF usando los valores originales nativos (tamaño carta estándar)
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Mapeamos el DOM (que ya trae su propio padding del CSS) directo al PDF
    // Evitamos inyectarle "- 10" márgenes Javascript duros para no generar bordes enormes de sobra
    const imgRatio = canvas.width / canvas.height;
    const pdfRatio = pdfWidth / pdfHeight;

    let finalWidth = pdfWidth;
    let finalHeight = pdfHeight;
    let offsetX = 0;
    let offsetY = 0;

    // Si por muchos artículos el contenedor rebasó la carta, escalamos hacia abajo 
    // para ajustarlo todo en 1 sola hoja PDF, asegurando que no se corte y quede centrado
    if (imgRatio < pdfRatio) {
      finalHeight = pdfHeight; 
      finalWidth = finalHeight * imgRatio;
      offsetX = (pdfWidth - finalWidth) / 2; // Centrar los pequeños bordes de sobra
    } else if (imgRatio > pdfRatio) {
      finalWidth = pdfWidth;
      finalHeight = finalWidth / imgRatio;
      offsetY = 0; // Pegarlo arriba (al cabo el CSS ya da aire superior)
    }

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);
    
    // Restauramos exactamente al método original usado antes de las modificaciones
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
  
  // Asegurar que tenga la clase base
  if (!clone.classList.contains('factura-container')) {
    clone.classList.add('factura-container');
  }

  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${nombreArchivo}</title>
        <style>
          ${facturaStyles}
          /* Hack específico para forzar la hoja en el navegador */
          @page { size: portrait; margin: 5mm; }
        </style>
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
;
