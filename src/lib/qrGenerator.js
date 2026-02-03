import QRCode from 'qrcode';

/**
 * Genera un QR code con los datos de la factura
 * @param {Object} datosFactura - Datos de la factura
 * @returns {Promise<string>} Data URL del QR code
 */
export async function generarQRFactura(datosFactura) {
  try {
    // Crear texto con información de la factura
    const textoQR = `FACTURA: ${datosFactura.numeroFactura}
CLIENTE: ${datosFactura.cliente.nombre}
TOTAL: $${datosFactura.total.toFixed(2)} MXN
FECHA: ${datosFactura.fecha}
RFC: ${datosFactura.cliente.rfc || 'N/A'}`;

    // Generar QR code como data URL
    const qrDataURL = await QRCode.toDataURL(textoQR, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrDataURL;
  } catch (error) {
    console.error('Error al generar QR:', error);
    throw new Error('No se pudo generar el código QR');
  }
}

/**
 * Convierte el data URL a buffer para Google Sheets
 * @param {string} dataURL - Data URL del QR
 * @returns {Buffer} Buffer de la imagen
 */
export function dataURLToBuffer(dataURL) {
  const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}
