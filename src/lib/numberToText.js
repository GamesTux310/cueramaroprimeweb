import { NumerosALetras } from 'numero-a-letras';

/**
 * Convierte un número a su representación en letras (español mexicano)
 * @param {number} cantidad - Cantidad a convertir
 * @returns {string} Cantidad en letras
 */
export function numeroALetras(cantidad) {
  try {
    // Separar pesos de centavos
    const pesos = Math.floor(cantidad);
    const centavos = Math.round((cantidad - pesos) * 100);

    // Convertir pesos a letras
    const pesosEnLetras = NumerosALetras(pesos);
    
    // Formatear resultado
    if (centavos > 0) {
      return `${pesosEnLetras} PESOS ${centavos}/100 M.N.`;
    } else {
      return `${pesosEnLetras} PESOS 00/100 M.N.`;
    }
  } catch (error) {
    console.error('Error al convertir número a letras:', error);
    return 'ERROR EN CONVERSIÓN';
  }
}

/**
 * Formatea una cantidad para mostrar con símbolo de pesos y separadores de miles
 * @param {number} cantidad - Cantidad a formatear
 * @param {boolean} sinDecimales - Si es true, no muestra decimales
 * @returns {string} Cantidad formateada con símbolo $ (ej: $1,000.00 o $1,000)
 */
export function formatearMoneda(cantidad, sinDecimales = false) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: sinDecimales ? 0 : 2,
    maximumFractionDigits: sinDecimales ? 0 : 2
  }).format(cantidad);
}

/**
 * Formatea un número con separadores de miles (sin símbolo de moneda)
 * @param {number} numero - Número a formatear
 * @param {number} decimales - Cantidad de decimales a mostrar (default 2)
 * @returns {string} Número formateado con comas (ej: 1,000.00)
 */
export function formatearNumero(numero, decimales = 2) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(numero);
}

/**
 * Formatea precio para mostrar en facturas con símbolo $ y comas
 * @param {number} cantidad - Cantidad a formatear
 * @returns {string} Precio formateado (ej: $1,234.56)
 */
export function formatearPrecio(cantidad) {
  const numero = Number(cantidad) || 0;
  return '$' + formatearNumero(numero, 2);
}
