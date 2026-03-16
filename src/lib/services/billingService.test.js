import { BillingService } from './billingService';

// Mock simple para la librería local si es necesario, pero intentaremos testear lo real primero.
jest.mock('../numberToText', () => ({
  parseDecimal: (val) => {
    if (!val || isNaN(parseFloat(val))) return 0;
    return parseFloat(val);
  }
}));

describe('BillingService (Auditoría Matemática y Lógica)', () => {

  describe('💰 calcularSubtotal()', () => {
    it('1. Debe realizar multiplicaciones perfectas con números enteros', () => {
      const carrito = [
        { precioVenta: 100, cantidad: 2 }, // 200
        { precioVenta: 50, cantidad: 1 }   // 50
      ];
      expect(BillingService.calcularSubtotal(carrito)).toBe(250);
    });

    it('2. Debe procesar kilos parciales (decimales pesados) correctamente', () => {
      const carrito = [
        { precioVenta: 15.5, cantidad: 2.5 }, // 38.75
        { precioVenta: 10.1, cantidad: 1 }    // 10.1
      ];
      // toBeCloseTo evalúa si los flotantes fallaron (el bug .999999 de JS)
      expect(BillingService.calcularSubtotal(carrito)).toBeCloseTo(48.85); 
    });

    it('3. Debe devolver $0 y no crashear la UI si el carrito se corrompe / está vacío', () => {
      expect(BillingService.calcularSubtotal([])).toBe(0);
      expect(BillingService.calcularSubtotal(null)).toBe(0);
      expect(BillingService.calcularSubtotal(undefined)).toBe(0);
    });

    it('4. Debe proteger contra "Ataques de Typo" (Escribir letras en cantidad)', () => {
      const carrito = [
        { precioVenta: 100, cantidad: "letras en vez de cantidad" }, // Falla intencional del usuario al teclear
        { precioVenta: 50, cantidad: 2 } // 100
      ];
      expect(BillingService.calcularSubtotal(carrito)).toBe(100);
    });
  });

  describe('📅 calcularDiasPlazo()', () => {
    beforeAll(() => {
      // Congelamos el tiempo global del sistema en el día exacto de la prueba para que siempre pase.
      jest.useFakeTimers().setSystemTime(new Date('2026-03-16T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('5. Debe calcular los "N" días exactos a futuro para abonos', () => {
        // En base a la fecha actual simulada, ¿Cuántos días faltan?
        expect(BillingService.calcularDiasPlazo('2026-03-31')).toBe('15 DÍAS');
    });

    it('6. Debe alertar con "HOY" si coinciden las fechas', () => {
      expect(BillingService.calcularDiasPlazo('2026-03-16')).toBe('HOY');
    });

    it('7. Debe castigar y etiquetar como "VENCIDO" cualquier cobro atrasado', () => {
      expect(BillingService.calcularDiasPlazo('2026-03-10')).toBe('VENCIDO');
    });
  });
});
