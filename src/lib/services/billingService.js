import { parseDecimal } from '../numberToText';

/**
 * Módulo puro (sin dependencias de React) encargado de las reglas de negocio 
 * de la facturación y ventas (Clean Code - Business Logic Layer).
 */
export const BillingService = {
  
  /**
   * Calcula el subtotal de un conjunto de productos en el carrito.
   * @param {Array} carrito - Lista de productos seleccionados
   * @returns {number} Subtotal calculado
   */
  calcularSubtotal: (carrito) => {
    if (!carrito || !Array.isArray(carrito)) return 0;
    
    return carrito.reduce((sum, item) => {
      const cantidad = parseDecimal(item.cantidad) || 0;
      const precio = item.precioVenta || 0;
      return sum + (precio * cantidad);
    }, 0);
  },

  /**
   * Calcula la fecha de vencimiento formateada base 'hoy' más N días.
   * (En este diseño específico, el usuario puede elegir el día manualmente)
   * 
   * @param {string} fechaVencimientoInput - Ej: '2026-03-30'
   * @returns {string} Fecha formateada en español
   */
  formatearFechaVencimiento: (fechaVencimientoInput) => {
    if (!fechaVencimientoInput) return '';
    const [anio, mes, dia] = fechaVencimientoInput.split('-');
    
    // El mes en JavaScript Date inicia en 0 (Enero = 0)
    const date = new Date(anio, mes - 1, dia);
    
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }).toUpperCase();
  },

  /**
   * Calcula los días restantes de plazo de pago basados en la fecha de vencimiento manual.
   *  
   * @param {string} fechaVencimiento - Cadena YYYY-MM-DD
   * @returns {string} Ejemplo: '15 DÍAS' o 'VENCIDO'
   */
  calcularDiasPlazo: (fechaVencimiento) => {
    if (!fechaVencimiento) return 'INMEDIATO';

    const hoy = new Date();
    // Normalizar a la medianoche hora local del navegador
    const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const [anio, mes, dia] = fechaVencimiento.split('-');
    const vencMidnight = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    
    const diffTime = vencMidnight - hoyMidnight;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'VENCIDO';
    if (diffDays === 0) return 'HOY';
    
    return `${diffDays} DÍAS`;
  },

  /**
   * Construye el Payload (objeto) de la Venta listo para guardarse en Base de Datos.
   */
  construirPayloadVenta: ({
    carrito,
    clienteSeleccionado,
    metodoPago,
    tipoFactura,
    fechaVencimiento,
    subtotal,
    total
  }) => {
    return {
      clienteId: clienteSeleccionado?.id || null,
      clienteNombre: clienteSeleccionado?.nombre || 'Público General',
      productos: carrito.map(item => ({
        id: item.id,
        nombre: item.nombre,
        cantidad: parseDecimal(item.cantidad) || 0,
        unidad: item.unidad || 'KG',
        codigo: `PROD-${String(item.id).padStart(3, '0')}`,
        precioUnitario: item.precioVenta,
        subtotal: (item.precioVenta || 0) * (parseDecimal(item.cantidad) || 0)
      })),
      subtotal: subtotal,
      descuento: 0,
      total: total,
      metodoPago: metodoPago,
      tipoFactura: tipoFactura,
      fechaVencimiento: tipoFactura === 'credito' ? fechaVencimiento : null,
      historialVencimientos: [],
      estado: metodoPago === 'credito' ? 'pendiente' : 'pagado',
    };
  },

  /**
   * Construye el documento "Factura" para PDF/Impresión 
   */
  construirPayloadFactura: ({
    ventaId,
    numFactura,
    fechaEmision,
    fechaVencFormatted,
    plazoPago,
    carrito,
    clienteSeleccionado,
    direccionEntrega,
    metodoPago,
    tipoFactura,
    subtotal,
    total
  }) => {
    return {
      ventaId: ventaId,
      numeroFactura: numFactura,
      fechaEmision: fechaEmision,
      fechaVencimiento: fechaVencFormatted,
      expedidaEn: 'CUERÁMARO, GUANAJUATO',
      metodoPago: metodoPago === 'credito' ? 'CRÉDITO' : metodoPago === 'transferencia' ? 'TRANSFERENCIA' : 'CONTADO/EFECTIVO',
      plazoPago: plazoPago,
      tipoFactura: tipoFactura,
      vendedor: 'OSCAR PANTOJA',
      cliente: {
        codigo: clienteSeleccionado ? `CLI-${String(clienteSeleccionado.id).padStart(3, '0')}` : 'CLI-000',
        nombre: clienteSeleccionado?.nombre || 'PÚBLICO GENERAL',
        direccion: clienteSeleccionado?.direccion || '',
        cp: clienteSeleccionado?.cp || '',
        rfc: clienteSeleccionado?.rfc || '',
        telefono: clienteSeleccionado?.telefono || '',
        ciudad: clienteSeleccionado?.ciudad || '',
        direccionEntrega: direccionEntrega || ''
      },
      productos: carrito.map(item => ({
        cantidad: parseDecimal(item.cantidad) || 0,
        codigo: `PROD-${String(item.id).padStart(3, '0')}`,
        unidad: item.unidad || 'KG',
        descripcion: item.nombre.toUpperCase(),
        precioUnitario: item.precioVenta,
        importe: (item.precioVenta || 0) * (parseDecimal(item.cantidad) || 0)
      })),
      subtotal: subtotal,
      total: total,
      estado: metodoPago === 'credito' ? 'pendiente' : 'pagado'
    };
  }
};
