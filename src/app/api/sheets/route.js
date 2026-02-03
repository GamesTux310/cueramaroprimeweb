import { NextResponse } from 'next/server';
import { agregarFacturaASheet, inicializarHoja, crearFacturaPersonalizada } from '@/lib/googleSheets';

/**
 * API Route para sincronización con Google Sheets
 * POST /api/sheets
 * 
 * Soporta dos acciones:
 * - init: Inicializa la hoja de Facturas
 * - add: Agrega una factura a la hoja
 */
export async function POST(request) {
  try {
    const { action, factura } = await request.json();

    // Validar credenciales
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Credenciales de Google Sheets no configuradas. Verifica tu archivo .env.local' 
        },
        { status: 500 }
      );
    }

    // Acción: Inicializar hoja
    if (action === 'init') {
      const result = await inicializarHoja();
      return NextResponse.json(result);
    }

    // Acción: Agregar factura (formato simple)
    if (action === 'add') {
      if (!factura) {
        return NextResponse.json(
          { success: false, error: 'Datos de factura no proporcionados' },
          { status: 400 }
        );
      }

      const result = await agregarFacturaASheet(factura);
      return NextResponse.json(result);
    }

    // 🆕 Acción: Crear factura en hoja nueva con plantilla personalizada
    if (action === 'createInvoiceSheet') {
      if (!factura) {
        return NextResponse.json(
          { success: false, error: 'Datos de factura no proporcionados' },
          { status: 400 }
        );
      }

      const result = await crearFacturaPersonalizada(factura);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Acción no válida. Usa "init", "add" o "createInvoiceSheet"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error en API de Google Sheets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
