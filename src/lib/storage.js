// ========================================
// Sistema de Almacenamiento Relacional Híbrido
// Dexie.js (Motor Principal) + Firebase (Sincronización)
// ========================================
import { db as dexieDb } from './db';
export const db = dexieDb;

const isClient = typeof window !== 'undefined';

// ========================================
// Generic Repository (DRY Pattern)
// ========================================
function validateNumbers(data) {
  for (const key in data) {
    if (typeof data[key] === 'number') {
      if (isNaN(data[key])) throw new Error(`El campo ${key} no es un número válido`);
      if (data[key] < 0 && key !== 'utilidadReal' && key !== 'margen') {
         throw new Error(`No se permiten valores negativos en cantidades o montos (${key})`);
      }
    }
  }
}

export async function getAll(tableName) {
  if (!isClient) return [];
  try { return await dexieDb[tableName].toArray(); } catch(e) { throw e; }
}

export async function saveAll(tableName, dataArray) {
  if (!isClient) return;
  try {
    await dexieDb[tableName].clear();
    await dexieDb[tableName].bulkPut(dataArray);
  } catch(e) { throw e; }
}

export async function createRecord(tableName, data) {
  if (!isClient) return null;
  validateNumbers(data);
  const newData = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const idGen = await dexieDb[tableName].add(newData);
  newData.id = idGen;
  // Sincronización automática a Firebase ELIMINADA (Offline-First)
  return newData;
}

export async function updateRecord(tableName, id, data) {
  if (!isClient) return null;
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) throw new Error('ID de registro inválido o no proporcionado');
  validateNumbers(data);
  const record = await dexieDb[tableName].get(numId);
  if (record) {
    const updated = { ...record, ...data, updatedAt: new Date().toISOString() };
    await dexieDb[tableName].put(updated);
    // Sincronización automática a Firebase ELIMINADA (Offline-First)
    return updated;
  }
  return null;
}

export async function deleteRecord(tableName, id) {
  if (!isClient) return;
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) throw new Error('ID de registro inválido o no proporcionado');
  await dexieDb[tableName].delete(numId);
  // Sincronización automática a Firebase ELIMINADA (Offline-First)
}

// ========================================
// Clientes
// ========================================
export const getClientes = () => getAll('clientes');
export const saveClientes = (clientesArray) => saveAll('clientes', clientesArray);
export const deleteCliente = (id) => deleteRecord('clientes', id);
export const updateCliente = (id, datos) => updateRecord('clientes', id, datos);

// Cascade Delete: Eliminar cliente + todos sus datos vinculados
export async function deleteClienteCascade(clienteId) {
  if (!isClient) return { total: 0 };
  const numId = parseInt(clienteId, 10);
  if (isNaN(numId) || numId <= 0) throw new Error('ID de cliente inválido');
  const codigoCliente = `CLI-${String(numId).padStart(3, '0')}`;

  return await dexieDb.transaction('rw', dexieDb.clientes, dexieDb.facturas, dexieDb.ventas, dexieDb.abonos, async () => {
    // Facturas vinculadas al cliente (por código)
    const facturasCliente = await dexieDb.facturas.toArray();
    const idsFacturas = facturasCliente.filter(f => f.cliente?.codigo === codigoCliente).map(f => f.id);
    if (idsFacturas.length > 0) await dexieDb.facturas.bulkDelete(idsFacturas);

    // Ventas vinculadas al cliente
    const ventasCliente = await dexieDb.ventas.toArray();
    const idsVentas = ventasCliente.filter(v => v.clienteId === numId).map(v => v.id);
    if (idsVentas.length > 0) await dexieDb.ventas.bulkDelete(idsVentas);

    // Abonos vinculados al cliente
    const abonosCliente = await dexieDb.abonos.toArray();
    const idsAbonos = abonosCliente.filter(a => a.clienteId === numId).map(a => a.id);
    if (idsAbonos.length > 0) await dexieDb.abonos.bulkDelete(idsAbonos);

    // Eliminar cliente
    await dexieDb.clientes.delete(numId);

    return { facturas: idsFacturas.length, ventas: idsVentas.length, abonos: idsAbonos.length, total: idsFacturas.length + idsVentas.length + idsAbonos.length + 1 };
  });
}

export async function addCliente(cliente) {
  return createRecord('clientes', {
    ...cliente,
    fechaRegistro: new Date().toISOString().split('T')[0],
    ultimaCompra: null,
    saldoPendiente: 0,
  });
}

// ========================================
// Productos
// ========================================
export const getProductos = () => getAll('productos');
export const saveProductos = (productos) => saveAll('productos', productos);
export const addProducto = (producto) => createRecord('productos', producto);
export const updateProducto = (id, datos) => updateRecord('productos', id, datos);
export const deleteProducto = (id) => deleteRecord('productos', id);

export async function actualizarStock(id, cantidad, tipo = 'agregar') {
  if (!isClient) return null;
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) throw new Error('ID de registro inválido o no proporcionado');
  if (cantidad < 0) throw new Error('No se permiten valores negativos en cantidades o montos');
  
  return await dexieDb.transaction('rw', dexieDb.productos, async () => {
    const producto = await dexieDb.productos.get(numId);
    if (!producto) return null;
    if (tipo === 'agregar') producto.stock += cantidad;
    else if (tipo === 'restar') producto.stock = Math.max(0, producto.stock - cantidad);
    await dexieDb.productos.put(producto);
    return producto;
  });
}

// ========================================
// Proveedores
// ========================================
export const getProveedores = () => getAll('proveedores');
export const saveProveedores = (proveedores) => saveAll('proveedores', proveedores);
export const updateProveedor = (id, datos) => updateRecord('proveedores', id, datos, false);
export const addProveedor = (proveedor) => createRecord('proveedores', { ...proveedor, estado: 'activo' }, false);

// Cascade Delete: Eliminar proveedor + todas sus compras
export async function deleteProveedorCascade(proveedorId) {
  if (!isClient) return { total: 0 };
  const numId = parseInt(proveedorId, 10);
  if (isNaN(numId) || numId <= 0) throw new Error('ID de proveedor inválido');

  return await dexieDb.transaction('rw', dexieDb.proveedores, dexieDb.compras, async () => {
    const comprasDelProv = await dexieDb.compras.toArray();
    const idsCompras = comprasDelProv.filter(c => c.proveedorId === numId).map(c => c.id);
    if (idsCompras.length > 0) await dexieDb.compras.bulkDelete(idsCompras);

    await dexieDb.proveedores.delete(numId);

    return { compras: idsCompras.length, total: idsCompras.length + 1 };
  });
}
// ========================================
// Ventas
// ========================================
export const getVentas = () => getAll('ventas');
export const saveVentas = (ventas) => saveAll('ventas', ventas);
export const deleteVenta = (id) => deleteRecord('ventas', id);
export const updateVenta = (id, datos) => updateRecord('ventas', id, datos);

export async function addVenta(venta) {
  if (!isClient) return null;
  
  if ((venta.total !== undefined && venta.total < 0) || (venta.subtotal !== undefined && venta.subtotal < 0)) {
    throw new Error('No se permiten valores negativos en cantidades o montos');
  }
  
  return await dexieDb.transaction('rw', [dexieDb.ventas, dexieDb.lotes, dexieDb.productos, dexieDb.clientes], async () => {
    let costoTotalReal = 0;
    const productosConLotes = [];
    
    for (const item of venta.productos) {
      if (item.cantidad < 0 || item.precioVenta < 0) {
        throw new Error('No se permiten valores negativos en cantidades o montos');
      }
      const rawId = item.productoId ?? item.id;
      const pIdNum = parseInt(rawId, 10);
      if (isNaN(pIdNum)) throw new Error(`Error en Venta: ID inválido (${rawId})`);
      
      item.productoId = pIdNum; 
      const lotesConsumidos = await consumirLotes(pIdNum, item.cantidad);
      const costoItem = lotesConsumidos.reduce((sum, l) => sum + l.costoTotal, 0);
      costoTotalReal += costoItem;
      productosConLotes.push({ ...item, lotesConsumidos, costoReal: costoItem });
    }
    
    let sanitizedClienteId = null;
    if (venta.clienteId) {
      const cid = parseInt(venta.clienteId, 10);
      if (!isNaN(cid)) sanitizedClienteId = cid;
    }

    const nuevaVenta = await createRecord('ventas', {
      ...venta,
      clienteId: sanitizedClienteId,
      fecha: new Date().toISOString(),
      productos: productosConLotes,
      costoTotalReal,
      utilidadReal: venta.total - costoTotalReal,
    });
    
    for (const item of nuevaVenta.productos) {
      await actualizarStock(item.productoId, item.cantidad, 'restar');
    }
    
    console.log('[DEBUG addVenta] nuevaVenta.metodoPago:', nuevaVenta.metodoPago, '| sanitizedClienteId:', sanitizedClienteId, '| nuevaVenta.total:', nuevaVenta.total);
    if (nuevaVenta.metodoPago === 'credito' && sanitizedClienteId) {
      console.log('[DEBUG addVenta] ✅ ENTRANDO a bloque crédito');
      const cliente = await dexieDb.clientes.get(sanitizedClienteId);
      console.log('[DEBUG addVenta] Cliente encontrado:', cliente?.nombre, '| saldoPendiente actual:', cliente?.saldoPendiente);
      if (cliente) {
          const nuevoSaldo = (cliente.saldoPendiente || 0) + nuevaVenta.total;
          console.log('[DEBUG addVenta] Nuevo saldoPendiente será:', nuevoSaldo);
          await updateCliente(cliente.id, {
              saldoPendiente: nuevoSaldo,
              ultimaCompra: nuevaVenta.fecha.split('T')[0],
          });
          console.log('[DEBUG addVenta] ✅ updateCliente completado');
      }
    } else {
      console.log('[DEBUG addVenta] ❌ NO entró al bloque crédito. metodoPago:', nuevaVenta.metodoPago, '| clienteId:', sanitizedClienteId);
    }
    return nuevaVenta;
  });
}

// ========================================
// Abonos 
// ========================================
export const getAbonos = () => getAll('abonos');
export const saveAbonos = (abonos) => saveAll('abonos', abonos);

export async function addAbono(abono) {
  if (!isClient) return null;
  if (abono.monto !== undefined && abono.monto < 0) throw new Error('No se permiten valores negativos en montos');

  return await dexieDb.transaction('rw', [dexieDb.abonos, dexieDb.clientes, dexieDb.facturas], async () => {
    const año = new Date().getFullYear();
    const abonosDelAño = await dexieDb.abonos.toArray();
    const filtroAbonos = abonosDelAño.filter(a => a.numeroAbono && a.numeroAbono.startsWith(`ABONO-${año}`));
    const ultimoNumero = filtroAbonos.length > 0 ? Math.max(...filtroAbonos.map(a => parseInt(a.numeroAbono.split('-')[2]) || 0)) : 0;
    
    const numeroAbono = `ABONO-${año}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
    
    const nuevoAbono = {
      ...abono,
      numeroAbono,
      fecha: new Date().toISOString(),
      comprobanteURL: abono.comprobanteURL || null,
    };
    
    const idGen = await dexieDb.abonos.add(nuevoAbono);
    nuevoAbono.id = idGen;
    
    const clienteIdNum = parseInt(abono.clienteId, 10);
    if (isNaN(clienteIdNum) || clienteIdNum <= 0) throw new Error('ID de registro inválido (clienteId)');

    const cliente = await dexieDb.clientes.get(clienteIdNum);
    if (cliente) {
      const saldoActualCliente = cliente.saldoPendiente || 0;
      const nuevoSaldo = Math.max(0, saldoActualCliente - abono.monto);
      await updateCliente(cliente.id, {
        saldoPendiente: nuevoSaldo,
        estado: nuevoSaldo === 0 ? 'activo' : cliente.estado,
      });
    }

    // --- LÓGICA DE APLICACIÓN A FACTURAS ---
    const facturasTodas = await dexieDb.facturas.toArray();
    let saldoAbonoRestante = abono.monto;
    const facturasAfectadas = [];

    if (abono.facturaId) {
      // SELECCIÓN MANUAL: Aplicar solo a la factura elegida por el usuario
      const factura = facturasTodas.find(f => f.id === abono.facturaId);
      if (factura && factura.estado === 'pendiente') {
        const saldoActualFactura = factura.saldoPendiente !== undefined ? factura.saldoPendiente : factura.total;
        if (saldoActualFactura > 0) {
          const montoAAplicar = Math.min(saldoActualFactura, saldoAbonoRestante);
          const nuevoSaldoFactura = saldoActualFactura - montoAAplicar;
          saldoAbonoRestante -= montoAAplicar;
          await dexieDb.facturas.put({
            ...factura,
            saldoPendiente: nuevoSaldoFactura,
            estado: nuevoSaldoFactura <= 0.01 ? 'pagado' : 'pendiente'
          });
          facturasAfectadas.push(factura.numeroFactura);
        }
      }
    } else {
      // FIFO AUTOMÁTICO: Liquidar facturas más antiguas primero
      const facturasCliente = facturasTodas.filter(f => 
        f.cliente?.codigo === `CLI-${String(abono.clienteId).padStart(3, '0')}` &&
        f.estado === 'pendiente'
      );
      facturasCliente.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      for (const factura of facturasCliente) {
        if (saldoAbonoRestante <= 0) break;
        const saldoActualFactura = factura.saldoPendiente !== undefined ? factura.saldoPendiente : factura.total;
        if (saldoActualFactura <= 0) continue;
        const montoAAplicar = Math.min(saldoActualFactura, saldoAbonoRestante);
        const nuevoSaldoFactura = saldoActualFactura - montoAAplicar;
        saldoAbonoRestante -= montoAAplicar;
        await dexieDb.facturas.put({
          ...factura,
          saldoPendiente: nuevoSaldoFactura,
          estado: nuevoSaldoFactura <= 0.01 ? 'pagado' : 'pendiente'
        });
        facturasAfectadas.push(factura.numeroFactura);
      }
    }

    nuevoAbono.facturasAfectadas = facturasAfectadas;
    // ----------------------------------
    
    const facturaAbono = await addFacturaAbono({
      abonoId: idGen,
      numeroAbono,
      clienteId: abono.clienteId,
      clienteNombre: abono.clienteNombre,
      monto: abono.monto,
      metodoPago: abono.metodoPago,
      saldoAnterior: abono.saldoAnterior,
      saldoNuevo: abono.saldoNuevo,
      facturasAfectadas,
    });
    
    nuevoAbono.facturaId = facturaAbono.id;
    nuevoAbono.numeroFactura = facturaAbono.numeroFactura;
    await dexieDb.abonos.put(nuevoAbono);
    
    return nuevoAbono;
  });
}

export async function addFacturaAbono(abonoData) {
  if (!isClient) return null;
  if (abonoData.monto !== undefined && abonoData.monto < 0) throw new Error('No se permiten valores negativos en montos');
  
  const numeroFactura = await generarNumeroFactura('abono', abonoData.clienteNombre || '');
  const fechaHoy = new Date().toISOString().split('T')[0];

  // Obtener datos completos del cliente para la factura
  const clienteIdNum = parseInt(abonoData.clienteId, 10);
  let clienteCompleto = { codigo: `CLI-${String(abonoData.clienteId).padStart(3, '0')}`, nombre: abonoData.clienteNombre };
  if (!isNaN(clienteIdNum) && clienteIdNum > 0) {
    const clienteBD = await dexieDb.clientes.get(clienteIdNum);
    if (clienteBD) {
      clienteCompleto = {
        codigo: `CLI-${String(clienteBD.id).padStart(3, '0')}`,
        nombre: clienteBD.nombre || '',
        direccion: clienteBD.direccion || '',
        cp: clienteBD.cp || '',
        rfc: clienteBD.rfc || '',
        telefono: clienteBD.telefono || '',
        ciudad: clienteBD.ciudad || '',
        direccionEntrega: clienteBD.direccionEntrega || '',
      };
    }
  }

  const metodoPagoTexto = abonoData.metodoPago === 'efectivo' ? 'EFECTIVO' : 
                          abonoData.metodoPago === 'tarjeta' ? 'DEPÓSITO' : 'TRANSFERENCIA';
  
  const nuevaFactura = {
    numeroFactura,
    tipoFactura: 'abono',
    abonoId: abonoData.abonoId,
    numeroAbono: abonoData.numeroAbono,
    fechaEmision: fechaHoy,
    fecha: fechaHoy,
    fechaCreacion: new Date().toISOString(),
    expedidaEn: 'CUERÁMARO, GUANAJUATO',
    metodoPago: metodoPagoTexto,
    vendedor: 'OSCAR PANTOJA',
    cliente: clienteCompleto,
    facturasAfectadas: abonoData.facturasAfectadas || [],
    productos: [{
      cantidad: 1, codigo: abonoData.numeroAbono, unidad: 'PAGO',
      descripcion: `ABONO A CUENTA - ${metodoPagoTexto}`,
      precioUnitario: abonoData.monto, importe: abonoData.monto,
    }],
    subtotal: abonoData.monto, total: abonoData.monto, estado: 'pagado',
    saldoAnterior: abonoData.saldoAnterior, saldoNuevo: abonoData.saldoNuevo,
  };
  
  const idGen = await dexieDb.facturas.add(nuevaFactura);
  nuevaFactura.id = idGen;
  return nuevaFactura;
}

// ========================================
// Gastos
// ========================================
export const getGastos = () => getAll('gastos');
export const deleteGasto = (id) => deleteRecord('gastos', id, false);

export async function addGasto(gasto) {
  return createRecord('gastos', {
    ...gasto,
    fecha: gasto.fecha || new Date().toISOString(),
  }, false);
}

// ========================================
// Facturas
// ========================================
export const getFacturas = () => getAll('facturas');
export const saveFacturas = (data) => saveAll('facturas', data);
export const deleteFactura = (id) => deleteRecord('facturas', id, false);
export const updateFactura = (id, datos) => updateRecord('facturas', id, datos, false);

/**
 * Genera número de factura con siglas inteligentes.
 * @param {string} tipo - 'credito', 'contado', 'abono' (default: 'contado')
 * @param {string} clienteNombre - Nombre del cliente para extraer iniciales
 * @returns {string} Ej: FC-04-2026-JP-001, FA-04-2026-MG-001, AB-04-2026-JP-001
 */
export async function generarNumeroFactura(tipo = 'contado', clienteNombre = '') {
  const facturasTodas = await dexieDb.facturas.toArray();
  const fechaActual = new Date();
  const año = fechaActual.getFullYear();
  const mesNumero = (fechaActual.getMonth() + 1).toString().padStart(2, '0');

  // Determinar prefijo según tipo
  let prefijo = 'FA'; // Factura Adelanto (contado) por defecto
  if (tipo === 'credito') prefijo = 'FC'; // Factura Crédito
  else if (tipo === 'abono') prefijo = 'AB'; // Abono

  // Extraer iniciales del cliente (primeras 2 palabras)
  const palabras = (clienteNombre || 'XX').trim().toUpperCase().split(/\s+/);
  const iniciales = palabras.length >= 2
    ? (palabras[0][0] || 'X') + (palabras[1][0] || 'X')
    : (palabras[0][0] || 'X') + (palabras[0][1] || 'X');

  const prefijoCompleto = `${prefijo}-${mesNumero}-${año}-${iniciales}-`;

  // Contar secuencia solo del mismo prefijo+mes+año (sin importar iniciales)
  const prefijoBase = `${prefijo}-${mesNumero}-${año}-`;
  const facturasDelMes = facturasTodas.filter(f => f.numeroFactura && f.numeroFactura.startsWith(prefijoBase));
  const ultimoNumero = facturasDelMes.length > 0
    ? Math.max(...facturasDelMes.map(f => parseInt(f.numeroFactura.split('-').pop()) || 0))
    : 0;

  return `${prefijoCompleto}${(ultimoNumero + 1).toString().padStart(3, '0')}`;
}

export async function addFactura(facturaData) {
  const tipoFact = facturaData.tipoFactura === 'credito' ? 'credito' : 'contado';
  const nombreCliente = facturaData.cliente?.nombre || '';
  const numeroFactura = await generarNumeroFactura(tipoFact, nombreCliente);
  return createRecord('facturas', {
    ...facturaData,
    numeroFactura,
    fecha: new Date().toISOString().split('T')[0],
    fechaCreacion: new Date().toISOString(),
  }, false);
}

// ========================================
// Notas
// ========================================
export async function getNotas() {
  if (!isClient) return [];
  try { 
    const nt = await dexieDb.notas.toArray();
    return nt.reverse(); 
  } catch(e) { throw e; }
}

export async function saveNotas(notas) {
  if (!isClient) return;
  try {
    await dexieDb.notas.clear();
    await dexieDb.notas.bulkPut(notas.reverse());
  } catch(e) { throw e; }
}

export const updateNota = (id, datos) => updateRecord('notas', id, datos, false);
export const deleteNota = (id) => deleteRecord('notas', id, false);
export const addNota = (nota) => createRecord('notas', { ...nota, fecha: new Date().toISOString() }, false);

// ========================================
// Lotes de Inventario (PEPS)
// ========================================
export async function getLotes(productoId = null) {
  if (!isClient) return [];
  try {
    let lotes;
    if (productoId !== null) {
      const numId = parseInt(productoId, 10);
      if (isNaN(numId) || numId <= 0) throw new Error('ID de registro inválido o no proporcionado');
      lotes = await dexieDb.lotes.where('productoId').equals(numId).toArray();
      return lotes.filter(l => l.cantidadRestante > 0).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    } else {
      lotes = await dexieDb.lotes.toArray();
    }
    return lotes;
  } catch(e) { return []; }
}

export const saveLotes = (lotes) => saveAll('lotes', lotes);

export async function addLote(lote) {
  return createRecord('lotes', {
    productoId: lote.productoId,
    productoNombre: lote.productoNombre,
    proveedorId: lote.proveedorId,
    proveedorNombre: lote.proveedorNombre,
    precioCompra: lote.precioCompra,
    precioVenta: lote.precioVenta,
    cantidadOriginal: lote.cantidad,
    cantidadRestante: lote.cantidad,
    unidad: lote.unidad || 'KG',
    fecha: new Date().toISOString(),
    compraId: lote.compraId,
    adjuntoURL: lote.adjuntoURL || null,
  });
}

export async function consumirLotes(productoId, cantidadAConsumir) {
  if (!isClient) return [];
  const pIdNum = parseInt(productoId, 10);
  if (isNaN(pIdNum) || pIdNum <= 0) throw new Error('ID de registro inválido (consumirLotes)');
  if (cantidadAConsumir < 0) throw new Error('No se permiten valores negativos');
  const lotesProducto = await getLotes(pIdNum);
  
  let restante = cantidadAConsumir;
  const lotesConsumidos = [];
  
  await dexieDb.transaction('rw', dexieDb.lotes, async () => {
    for (const lote of lotesProducto) {
      if (restante <= 0) break;
      const consumir = Math.min(lote.cantidadRestante, restante);
      
      if (consumir > 0) {
        lotesConsumidos.push({
          loteId: lote.id, cantidadConsumida: consumir,
          precioCompra: lote.precioCompra, costoTotal: consumir * lote.precioCompra,
        });
        lote.cantidadRestante -= consumir;
        await dexieDb.lotes.put(lote);
        restante -= consumir;
      }
    }
  });
  
  if (restante > 0) {
    lotesConsumidos.push({ loteId: null, cantidadConsumida: restante, precioCompra: 0, costoTotal: 0, nota: 'Stock sin lote asignado' });
  }
  return lotesConsumidos;
}

export async function getStockReal(productoId) {
  if(!isClient) return 0;
  const lotesProducto = await getLotes(productoId);
  return lotesProducto.reduce((sum, lote) => sum + lote.cantidadRestante, 0);
}

// ========================================
// Compras
// ========================================
export const getCompras = () => getAll('compras');
export const saveCompras = (compras) => saveAll('compras', compras);
export const deleteCompra = async (id) => { await deleteRecord('compras', id, false); return await getCompras(); }

export async function addCompra(compra) {
  if (!isClient) return null;
  
  return await dexieDb.transaction('rw', [dexieDb.compras, dexieDb.lotes, dexieDb.productos, dexieDb.proveedores, dexieDb.gastos], async () => {
    const total = compra.precioCompra * compra.cantidad;
    const margen = compra.precioCompra > 0 ? ((compra.precioVenta - compra.precioCompra) / compra.precioCompra) * 100 : 100;

    const nuevaCompra = await createRecord('compras', {
      ...compra,
      fecha: new Date().toISOString(),
      margen: margen,
      total: total,
      adjuntoURL: compra.adjuntoURL || null,
    }, false);

    await addLote({
      productoId: compra.productoId, productoNombre: compra.productoNombre,
      proveedorId: compra.proveedorId, proveedorNombre: compra.proveedorNombre,
      precioCompra: compra.precioCompra, precioVenta: compra.precioVenta,
      cantidad: compra.cantidad, unidad: compra.unidad,
      compraId: nuevaCompra.id, adjuntoURL: compra.adjuntoURL || null,
    });

    // ERP: Actualizar el precio de compra del producto maestro
    const productoMaestro = await dexieDb.productos.get(Number(compra.productoId));
    if (productoMaestro) {
      await updateProducto(productoMaestro.id, {
        precioCompra: compra.precioCompra,
        precioVenta: compra.precioVenta,
        proveedorId: compra.proveedorId,
        proveedorNombre: compra.proveedorNombre
      });
      // ERP: Aumentar stock automáticamente para eliminar silos de datos
      await actualizarStock(productoMaestro.id, compra.cantidad, 'agregar');
    }

    if (compra.tipoCompra === 'credito') {
      const proveedor = await dexieDb.proveedores.get(Number(compra.proveedorId));
      if (proveedor) {
        await updateProveedor(proveedor.id, { saldoPendiente: (proveedor.saldoPendiente || 0) + total });
      }
    } else {
      await addGasto({
        titulo: `Compra de Mercancía (Contado)`,
        descripcion: `${compra.cantidad} ${compra.unidad || 'u'} de ${compra.productoNombre} a ${compra.proveedorNombre}`,
        monto: total, categoria: 'Mercancía', fecha: nuevaCompra.fecha
      });
    }
    return nuevaCompra;
  });
}

export async function registrarAbonoProveedor(abono) {
  if (!isClient) return null;
  if (abono.monto !== undefined && abono.monto < 0) throw new Error('No se permiten valores negativos');
  
  const idNum = parseInt(abono.proveedorId, 10);
  if (isNaN(idNum) || idNum <= 0) throw new Error('ID de registro inválido (registrarAbonoProveedor)');
  const prov = await dexieDb.proveedores.get(idNum);
  
  if (prov) {
    const nuevoSaldo = Math.max(0, (prov.saldoPendiente || 0) - abono.monto);
    const actualizado = await updateProveedor(prov.id, { saldoPendiente: nuevoSaldo });

    // Guardar el abono en su tabla para visualizar historial y comprobante
    const nuevoAbono = await createRecord('abonos', {
      proveedorId: prov.id,
      monto: abono.monto,
      metodoPago: abono.metodoPago,
      nota: abono.nota || '',
      comprobanteURL: abono.comprobanteURL || null,
      fecha: abono.fecha || new Date().toISOString()
    }, false);

    await addGasto({
      titulo: `Pago a Proveedor: ${prov.nombre}`,
      descripcion: `Abono a cuenta. Nota: ${abono.nota || '-'}`,
      monto: abono.monto, categoria: 'Mercancía',
      fecha: abono.fecha || new Date().toISOString(),
      metodoPago: abono.metodoPago,
      imagenComprobante: abono.comprobanteURL || null
    });
    return actualizado;
  }
  return null;
}

// ========================================
// Mermas
// ========================================
export const getMermas = () => getAll('mermas');
export const saveMermas = (mermas) => saveAll('mermas', mermas);

export async function registrarMerma({ productoId, cantidad, motivo, nota }) {
  if (!isClient) return null;
  const pIdNum = parseInt(productoId, 10);
  if (isNaN(pIdNum) || pIdNum <= 0) throw new Error('ID de registro inválido');
  
  const lotesConsumidos = await consumirLotes(pIdNum, cantidad);
  const costoTotal = lotesConsumidos.reduce((sum, l) => sum + l.costoTotal, 0);
  
  const nuevaMerma = await createRecord('mermas', {
    fecha: new Date().toISOString(), productoId: pIdNum,
    cantidad, motivo, nota, lotesAfectados: lotesConsumidos, costoTotal,
  });
  
  await actualizarStock(pIdNum, cantidad, 'restar');
  return nuevaMerma;
}

// ========================================
// Administración General
// ========================================
export async function resetearDatos() {
  if (!isClient) return;
  await Promise.all(dexieDb.tables.map(table => table.clear()));
}

export async function exportarDatos() {
  return {
    clientes: await getClientes(), productos: await getProductos(),
    proveedores: await getProveedores(), ventas: await getVentas(),
    gastos: await getGastos(), abonos: await getAbonos(),
    facturas: await getFacturas(), exportadoEn: new Date().toISOString(),
  };
}

export async function importarDatos(datos) {
  if (!isClient) return;
  if (datos.clientes) await saveClientes(datos.clientes);
  if (datos.productos) await saveProductos(datos.productos);
  if (datos.proveedores) await saveProveedores(datos.proveedores);
  if (datos.ventas) await saveVentas(datos.ventas);
  if (datos.gastos) await saveAll('gastos', datos.gastos);
  if (datos.abonos) await saveAll('abonos', datos.abonos);
  if (datos.facturas) await saveFacturas(datos.facturas);
  if (datos.compras) await saveAll('compras', datos.compras);
  if (datos.lotes) await saveAll('lotes', datos.lotes);
  if (datos.notas) await saveAll('notas', datos.notas);
}
