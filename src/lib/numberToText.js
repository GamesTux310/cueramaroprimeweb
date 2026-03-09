import { NumerosALetras } from 'numero-a-letras';

/**
 * Convierte un número a su representación en letras (español mexicano)
 * @param {number} cantidad - Cantidad a convertir
 * @returns {string} Cantidad en letras
 */
export function numeroALetras(cantidad) {
  try {
    // Si la cantidad no es válida, devolver 0
    if (isNaN(cantidad) || cantidad === null || cantidad === undefined) {
      return 'CERO PESOS 00/100 M.N.';
    }

    // La librería NumerosALetras espera un número. Aseguramos que sea número.
    const numero = Number(cantidad);

    // La librería devuelve "UN MIL...", lo corregimos manualmente
    let texto = NumerosALetras(numero).toUpperCase();
    
    // Corrección específica para "UN MIL" -> "MIL" al inicio
    if (texto.startsWith('UN MIL')) {
      texto = texto.substring(3).trim(); // Quita "UN " y deja "MIL..."
    }
    
    return texto;
  } catch (error) {
    console.error('Error al convertir número a letras:', error);
    // Fallback básico en caso de error grave de la librería
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

/**
 * Helper para parsear inputs numéricos que pueden venir con coma o punto
 * @param {string|number} valor 
 * @returns {number}
 */
export function parseDecimal(valor) {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  
  let str = valor.toString().trim();
  
  // Si tiene formato mixto (ej: 1,234.56 o 1.234,56)
  if (str.includes('.') && str.includes(',')) {
    if (str.indexOf('.') < str.indexOf(',')) {
       // 1.234,56 -> eliminar puntos, cambiar coma a punto
       str = str.replace(/\./g, '').replace(',', '.');
    } else {
       // 1,234.56 -> eliminar comas
       str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Solo comas: 38,270 -> 38.270
    // Asumimos que si hay coma y no punto, es decimal si solo hay una coma y son 3 decimales
    // O simplemente reemplazamos coma por punto para soportar formato decimal con coma
    str = str.replace(',', '.');
  }
  
  return parseFloat(str) || 0;
}
