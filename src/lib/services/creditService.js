/**
 * Módulo puro encargado de las reglas de negocio de los Créditos 
 * de Clientes y Proveedores (Clean Code - Business Logic Layer).
 */
export const CreditService = {
  /**
   * Valida si un monto de abono propuesto es válido basándose en el saldo actual del cliente.
   * Evita pagar más del gran total de la deuda.
   * 
   * @param {number} montoAbono - Monto que se desea abonar
   * @param {number} deudaTotal - Saldo global adeudado
   * @returns {boolean} Es válido o no
   */
  esAbonoValido: (montoAbono, deudaTotal) => {
    if (montoAbono <= 0) return false;
    return montoAbono <= deudaTotal;
  },

  /**
   * Calcula el nuevo saldo general después de un abono global.
   * @param {number} deudaTotal
   * @param {number} abono
   * @returns {number} Nuevo saldo contable
   */
  calcularNuevoSaldoGlobal: (deudaTotal, abono) => {
    const nuevoSaldo = deudaTotal - abono;
    return nuevoSaldo < 0 ? 0 : nuevoSaldo; // Nunca saldo negativo
  },

  /**
   * Distribuye un abono global entre las diferentes facturas pendientes de un cliente, 
   * pagando primero las más antiguas (algoritmo FIFO).
   * 
   * @param {Array} facturasPendientes - Arreglo de facturas no pagadas ordenadas por fecha
   * @param {number} montoAbono - Total abonado por el cliente
   * @returns {Array} Plan de abonos detallado lista para almacenar en DB
   */
  distribuirAbonoEnFacturas: (facturasPendientes, montoAbono) => {
    if (!facturasPendientes || montoAbono <= 0) return [];
    
    let saldoPorRepartir = montoAbono;
    const historialAbonosGenerado = [];

    // Por cada factura hasta gastar el saldo:
    for (const factura of facturasPendientes) {
      if (saldoPorRepartir <= 0) break;

      const deudaFactura = factura.total - (factura.abonado || 0);
      if (deudaFactura <= 0) continue;

      const montoAAplicar = Math.min(deudaFactura, saldoPorRepartir);
      
      historialAbonosGenerado.push({
        facturaId: factura.id,
        montoAplicado: montoAAplicar,
        restanteFactura: deudaFactura - montoAAplicar
      });

      saldoPorRepartir -= montoAAplicar;
    }

    return historialAbonosGenerado;
  }
};
