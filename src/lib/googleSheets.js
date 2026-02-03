import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Obtiene un cliente autenticado de Google Sheets
 * @returns {Promise<google.sheets>} Cliente de Google Sheets autenticado
 */
export async function getGoogleSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    return sheets;
  } catch (error) {
    console.error('Error al autenticar con Google:', error);
    throw new Error('No se pudo autenticar con Google Sheets API');
  }
}

/**
 * Agrega una factura a Google Sheets
 * @param {Object} factura - Datos de la factura
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function agregarFacturaASheet(factura) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID no está configurado en .env.local');
  }

  // Preparar datos en formato de fila
  const valores = [
    [
      factura.numeroFactura,
      factura.fecha,
      factura.cliente.nombre,
      factura.cliente.telefono || 'N/A',
      factura.productos.length,
      `$${factura.subtotal.toFixed(2)}`,
      `$${factura.iva.toFixed(2)}`,
      `$${factura.total.toFixed(2)}`,
      factura.metodoPago || 'N/A',
      factura.estado,
      new Date().toLocaleString('es-MX'),
    ],
  ];

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Facturas!A:K', // Nombre de hoja y rango
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: valores,
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al escribir en Google Sheets:', error);
    
    // Verificar si el error es por hoja no encontrada
    if (error.message.includes('Unable to parse range')) {
      throw new Error('La hoja "Facturas" no existe. Por favor, créala primero o ejecuta la inicialización.');
    }
    
    throw new Error(`Error al sincronizar con Google Sheets: ${error.message}`);
  }
}

/**
 * Crea/Verifica la estructura de la hoja de facturas
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function inicializarHoja() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID no está configurado en .env.local');
  }

  const encabezados = [
    'Número Factura',
    'Fecha',
    'Cliente',
    'Teléfono',
    'Productos',
    'Subtotal',
    'IVA',
    'Total',
    'Método Pago',
    'Estado',
    'Fecha Creación',
  ];

  try {
    // Verificar si existe la hoja "Facturas"
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const facturaSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties.title === 'Facturas'
    );

    if (!facturaSheet) {
      // Crear hoja si no existe
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Facturas',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 11,
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      });

      // Agregar encabezados
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Facturas!A1:K1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [encabezados],
        },
      });

      // Formatear encabezados (negrita, color)
      const sheetId = (await sheets.spreadsheets.get({ spreadsheetId }))
        .data.sheets.find((s) => s.properties.title === 'Facturas')
        .properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
          ],
        },
      });

      return { success: true, message: 'Hoja "Facturas" creada y configurada exitosamente' };
    }

    return { success: true, message: 'La hoja "Facturas" ya existe' };
  } catch (error) {
    console.error('Error al inicializar hoja:', error);
    throw new Error(`Error al configurar Google Sheets: ${error.message}`);
  }
}

// ========================================
// FUNCIONES AVANZADAS PARA PLANTILLA PERSONALIZADA
// ========================================

import { numeroALetras } from './numberToText.js';

/**
 * Crea una nueva hoja de factura con formato personalizado
 * @param {Object} datosFactura - Datos completos de la factura
 * @returns {Promise<Object>} Resultado con URL de la hoja creada
 */
/**
 * Crea una factura personalizada duplicando la plantilla "Nota Crédito"
 * y actualizando solo las celdas variables
 */
export async function crearFacturaPersonalizada(factura) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID no está configurado en .env.local');
    }

    // 1. Obtener ID de la hoja plantilla
    const sheetIdPlantilla = await obtenerSheetIdPlantilla(sheets, spreadsheetId);
    
    // 2. Duplicar y renombrar la hoja
    const numeroFactura = factura.numeroFactura;
    const nuevoSheetId = await duplicarYRenombrarHoja(
      sheets,
      spreadsheetId,
      sheetIdPlantilla,
      numeroFactura
    );

    // 3. Actualizar solo las celdas variables
    await actualizarDatosFactura(sheets, spreadsheetId, numeroFactura, factura);

    // 4. Retornar URL de la hoja creada
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${nuevoSheetId}`;
    
    return {
      success: true,
      url: url,
      sheetId: nuevoSheetId,
      numeroFactura: numeroFactura
    };
  } catch (error) {
    console.error('Error al crear factura personalizada:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene el sheetId de la hoja "Nota Crédito" que se usará como plantilla
 */
async function obtenerSheetIdPlantilla(sheets, spreadsheetId) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  
  // Buscar la hoja que contenga "Nota Crédito" en el nombre
  const plantilla = response.data.sheets.find(
    sheet => sheet.properties.title.includes('Nota Crédito') && 
             sheet.properties.title.includes('No Que No')
  );
  
  if (!plantilla) {
    throw new Error('No se encontró la hoja plantilla "Nota Crédito"');
  }
  
  return plantilla.properties.sheetId;
}

/**
 * Duplica la hoja plantilla y la renombra con el número de factura
 */
async function duplicarYRenombrarHoja(sheets, spreadsheetId, sheetIdPlantilla, numeroFactura) {
  const requests = [
    {
      duplicateSheet: {
        sourceSheetId: sheetIdPlantilla,
        newSheetName: numeroFactura,
        insertSheetIndex: 1  // Insertar después de la plantilla
      }
    }
  ];

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests }
  });

  return response.data.replies[0].duplicateSheet.properties.sheetId;
}

/**
 * Actualiza solo las celdas variables en la factura duplicada
 */
async function actualizarDatosFactura(sheets, spreadsheetId, nombreHoja, factura) {
  const updates = [];

  // Fecha de emisión (E4)
  const fecha = factura.fechaEmision || new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
  updates.push({
    range: `${nombreHoja}!E4`,
    values: [[fecha]]
  });

  // Expedida en (E6)
  updates.push({
    range: `${nombreHoja}!E6`,
    values: [['CUERAMARO, GUANAJUATO']]
  });

  // Datos del cliente
  if (factura.cliente) {
    updates.push({ range: `${nombreHoja}!B9`, values: [[factura.cliente.codigo || '']] });
    updates.push({ range: `${nombreHoja}!B10`, values: [[factura.cliente.nombre || '']] });
    updates.push({ range: `${nombreHoja}!B11`, values: [[factura.cliente.direccion || '']] });
    updates.push({ range: `${nombreHoja}!B12`, values: [[factura.cliente.cp || '']] });
    updates.push({ range: `${nombreHoja}!B13`, values: [[factura.cliente.rfc || '']] });
    updates.push({ range: `${nombreHoja}!B14`, values: [[factura.cliente.telefono || '']] });
  }

  // Productos - empezando en fila 18
  if (factura.productos && factura.productos.length > 0) {
    const productosData = factura.productos.map((p, index) => {
      const fila = 18 + index;
      return [
        p.cantidad || 1,
        p.codigo || '',
        p.unidad || 'PZA',
        p.descripcion || '',
        p.precioUnitario || 0,
        `=A${fila}*E${fila}`
      ];
    });

    updates.push({
      range: `${nombreHoja}!A18:F${17 + productosData.length}`,
      values: productosData
    });
  }

  // Importe con letra (B28)
  const importeConLetra = numeroALetras(factura.total);
  updates.push({ range: `${nombreHoja}!B28`, values: [[importeConLetra]] });

  // Total para pagaré (F32)
  if (factura.total) {
    updates.push({ range: `${nombreHoja}!F32`, values: [[factura.total]] });
  }

  // Ejecutar actualización en batch
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  });
}

// ========================================
// FUNCIONES OBSOLETAS - Mantener por compatibilidad con facturas simples
// ========================================

async function crearNuevaHoja(sheets, spreadsheetId, nombreHoja) {
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [{
        addSheet: {
          properties: {
            title: nombreHoja,
            gridProperties: {
              rowCount: 50,
              columnCount: 7
            }
          }
        }
      }]
    }
  });

  return response.data.replies[0].addSheet.properties.sheetId;
}

async function aplicarFormatoBase(sheets, spreadsheetId, sheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 100 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 80 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 60 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 300 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 100 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 100 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 150 }, fields: 'pixelSize' }},
      ]
    }
  });
}

async function escribirDatosFactura(sheets, spreadsheetId, nombreHoja, datos) {
  const updates = [];

  // Encabezado 
  updates.push({ range: `${nombreHoja}!A1`, values: [['CARNICERIA CUERAMARO PRIME']] });
  updates.push({ range: `${nombreHoja}!A2`, values: [['CUERAMARO, GUANAJUATO, MEXICO']] });
  updates.push({ range: `${nombreHoja}!A3`, values: [['COLONIA CUERAMARO CENTRO']] });
  updates.push({ range: `${nombreHoja}!A4`, values: [['CP: 36960']] });

  // Panel derecho
  updates.push({ range: `${nombreHoja}!F1`, values: [['NOTA DE CREDITO']] });
  updates.push({ range: `${nombreHoja}!F2`, values: [['FECHA DE EMISIÓN']] });
  updates.push({ range: `${nombreHoja}!G2`, values: [[datos.fechaEmision || datos.fecha]] });
  updates.push({ range: `${nombreHoja}!F3`, values: [['EXPEDIDA EN:']] });
  updates.push({ range: `${nombreHoja}!G3`, values: [[datos.expedidaEn || 'CUERÁMARO, GUANAJUATO']] });
  updates.push({ range: `${nombreHoja}!F4`, values: [['FECHA DE VENCIMIENTO']] });
  updates.push({ range: `${nombreHoja}!G4`, values: [[datos.fechaVencimiento || datos.fecha]] });
  updates.push({ range: `${nombreHoja}!F5`, values: [['MOTIVO DE PAGO']] });
  updates.push({ range: `${nombreHoja}!G5`, values: [[datos.motivoPago || 'VENTA']] });
  updates.push({ range: `${nombreHoja}!F6`, values: [['MONEDA']] });
  updates.push({ range: `${nombreHoja}!G6`, values: [[datos.moneda || 'M.N. MXN']] });
  updates.push({ range: `${nombreHoja}!F7`, values: [['VENDEDOR:']] });
  updates.push({ range: `${nombreHoja}!G7`, values: [[datos.vendedor || 'OSCAR PANTOJA']] });

  // Datos del cliente
  updates.push({ range: `${nombreHoja}!A7`, values: [['DATOS DEL CLIENTE']] });
  updates.push({ range: `${nombreHoja}!A8`, values: [['CÓDIGO']] });
  updates.push({ range: `${nombreHoja}!B8`, values: [[datos.cliente.codigo || '#0001']] });
  updates.push({ range: `${nombreHoja}!A9`, values: [['NOMBRE:']] });
  updates.push({ range: `${nombreHoja}!B9`, values: [[datos.cliente.nombre]] });
  updates.push({ range: `${nombreHoja}!A10`, values: [['DIRECCIÓN:']] });
  updates.push({ range: `${nombreHoja}!B10`, values: [[datos.cliente.direccion || '']] });
  updates.push({ range: `${nombreHoja}!A11`, values: [['R.F.C.:']] });
  updates.push({ range: `${nombreHoja}!B11`, values: [[datos.cliente.rfc || '']] });
  updates.push({ range: `${nombreHoja}!A12`, values: [['TEL:']] });
  updates.push({ range: `${nombreHoja}!B12`, values: [[datos.cliente.telefono || '']] });

  // Tabla de productos
  const filaInicio = 15;
  updates.push({ range: `${nombreHoja}!A${filaInicio}`, values: [['CANTIDAD', 'CÓDIGO', 'U.M.', 'DESCRIPCIÓN', 'PRECIO', '$', 'IMPORTE']] });

  datos.productos.forEach((p, i) => {
    const fila = filaInicio + 1 + i;
    updates.push({
      range: `${nombreHoja}!A${fila}`,
      values: [[p.cantidad, p.codigo || '#0001', p.unidad || 'KG', p.nombre, p.precio, '$', p.cantidad * p.precio]]
    });
  });

  // Totales
  const filaTotales = filaInicio + datos.productos.length + 3;
  updates.push({ range: `${nombreHoja}!A${filaTotales}`, values: [['IMPORTE:']] });
  updates.push({ range: `${nombreHoja}!B${filaTotales}`, values: [[datos.importeConLetra]] });
  updates.push({ range: `${nombreHoja}!E${filaTotales}`, values: [['SUBTOTAL']] });
  updates.push({ range: `${nombreHoja}!F${filaTotales}`, values: [['$']] });
  updates.push({ range: `${nombreHoja}!G${filaTotales}`, values: [[datos.subtotal]] });
  updates.push({ range: `${nombreHoja}!E${filaTotales + 1}`, values: [['IVA']] });
  updates.push({ range: `${nombreHoja}!F${filaTotales + 1}`, values: [['$']] });
  updates.push({ range: `${nombreHoja}!G${filaTotales + 1}`, values: [[datos.iva]] });
  updates.push({ range: `${nombreHoja}!E${filaTotales + 2}`, values: [['TOTAL']] });
  updates.push({ range: `${nombreHoja}!F${filaTotales + 2}`, values: [['$']] });
  updates.push({ range: `${nombreHoja}!G${filaTotales + 2}`, values: [[datos.total]] });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  });
}

async function aplicarFormatoFinal(sheets, spreadsheetId, sheetId) {
  const requests = [];

  // Merge encabezado
  requests.push({ mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' }});

  // Color naranja (NOTA DE CRÉDITO)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 5, endColumnIndex: 7 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 0.6, blue: 0 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 12 },
          horizontalAlignment: 'CENTER'
        }
      },
      fields: 'userEnteredFormat'
    }
  });

  // Paneles azules
  [1, 3, 5].forEach(fila => {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: fila, endRowIndex: fila + 1, startColumnIndex: 5, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.4, green: 0.7, blue: 1 },
            textFormat: { bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  });

  // Header tabla de productos
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 14, endRowIndex: 15, startColumnIndex: 0, endColumnIndex: 7 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER'
        }
      },
      fields: 'userEnteredFormat'
    }
  });

  // Bordes
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 35, startColumnIndex: 0, endColumnIndex: 7 },
      top: { style: 'SOLID', width: 1 },
      bottom: { style: 'SOLID', width: 1 },
      left: { style: 'SOLID', width: 1 },
      right: { style: 'SOLID', width: 1 },
      innerHorizontal: { style: 'SOLID', width: 1 },
      innerVertical: { style: 'SOLID', width: 1 }
    }
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests }
  });
}
