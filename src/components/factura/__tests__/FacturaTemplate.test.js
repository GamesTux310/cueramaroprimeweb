
import React from 'react';
import { render, screen } from '@testing-library/react';
import FacturaTemplate from '../FacturaTemplate';
import '@testing-library/jest-dom';

// Mock del helper numeroALetras
jest.mock('../../../lib/numberToText', () => ({
  numeroALetras: (num) => `PESOS ${num} 00/100 M.N.`
}));

describe('FacturaTemplate', () => {
  const mockFactura = {
    numeroFactura: 'F-2026-001',
    fechaEmision: '19/02/2026',
    cliente: {
      nombre: 'JUAN PEREZ',
      direccion: 'CALLE 1, CENTRO',
      direccionEntrega: 'CALLE 2, NORTE'
    },
    productos: [
      {
        cantidad: 2,
        codigo: 'P001',
        descripcion: 'CARNE RES',
        precioUnitario: 100
      }
    ],
    metodoPago: 'transferencia',
    total: 200
  };

  it('renders invoice details correctly', () => {
    render(<FacturaTemplate factura={mockFactura} />);
    
    expect(screen.getByText('F-2026-001')).toBeInTheDocument();
    
    const clientNames = screen.getAllByText('JUAN PEREZ');
    expect(clientNames.length).toBeGreaterThan(0);
    
    expect(screen.getByText('CARNE RES')).toBeInTheDocument();
    
    const totals = screen.getAllByText('$200.00');
    expect(totals.length).toBeGreaterThan(0);
  });

  it('displays the correct payment method static text', () => {
    render(<FacturaTemplate factura={mockFactura} />);
    // Check for the static method text
    expect(screen.getByText('TRANSFERENCIA/EFECTIVO/CRÉDITO')).toBeInTheDocument();
  });

  it('displays delivery address if provided', () => {
    render(<FacturaTemplate factura={mockFactura} />);
    expect(screen.getByText('CALLE 2, NORTE')).toBeInTheDocument();
  });

  it('does not fall back to main address if delivery address is missing', () => {
    const facturaSinEntrega = {
      ...mockFactura,
      cliente: {
        ...mockFactura.cliente,
        direccionEntrega: ''
      }
    };
    render(<FacturaTemplate factura={facturaSinEntrega} />);
    
    // Find the label "DIRECCIÓN DE ENTREGA:"
    const deliveryLabel = screen.getByText('DIRECCIÓN DE ENTREGA:');
    // The value is the next sibling span
    const deliveryValue = deliveryLabel.nextSibling;
    
    // It should be empty
    expect(deliveryValue).toHaveTextContent(/^$/);
  });
});
