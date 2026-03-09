import { db } from './db';

/**
 * Función para sembrar datos masivos REALISTAS en el ERP
 * Interactúa directamente con Dexie para evadir la sincronización automática.
 */
export async function seedDatabase() {
  console.log("🌱 Iniciando Database Seeder V2 (Flujo Completo)...");
  
  // 1. Purga Total (Wipe-Out)
  console.log("🧹 Purgando base de datos completa...");
  await db.transaction('rw', db.clientes, db.productos, db.ventas, db.proveedores, db.facturas, db.gastos, db.abonos, db.compras, db.lotes, async () => {
    await db.clientes.clear();
    await db.productos.clear();
    await db.ventas.clear();
    await db.proveedores.clear();
    await db.facturas.clear();
    await db.gastos.clear();
    await db.abonos.clear();
    await db.compras.clear();
    await db.lotes.clear();
  });

  const now = new Date();
  const unMesMs = 30 * 24 * 60 * 60 * 1000;
  function getRandomDate() {
    // 30% de probabilidad de que la operación haya sido HOY para tener datos en el Dashboard Principal
    if (Math.random() < 0.3) {
      return now.toISOString();
    }
    return new Date(now.getTime() - Math.random() * unMesMs).toISOString();
  }

  // 2. Entidades Base: Proveedores
  const proveedoresBase = [
    { nombre: 'Carnes San Juan', telefono: '555-0001', email: 'sanjuan@carnes.com', estado: 'activo', saldoPendiente: 0, createdAt: new Date().toISOString() },
    { nombre: 'Pollería El Rey', telefono: '555-0002', email: 'rey@pollo.com', estado: 'activo', saldoPendiente: 0, createdAt: new Date().toISOString() },
    { nombre: 'Abarrotes del Norte', telefono: '555-0003', email: 'norte@abarrotes.com', estado: 'activo', saldoPendiente: 0, createdAt: new Date().toISOString() }
  ];
  
  const provIds = await db.proveedores.bulkAdd(proveedoresBase, { allKeys: true });
  const provRecords = proveedoresBase.map((p, i) => ({ ...p, id: provIds[i] }));

  // 3. Entidades Base: Clientes
  const clientesBase = [
    { nombre: 'Taquería El Pastor', telefono: '555-1001', estado: 'activo', limiteCredito: 15000, saldoPendiente: 0, metodoPagoPreferido: 'efectivo', createdAt: new Date().toISOString() },
    { nombre: 'Restaurante La Parrilla', telefono: '555-1002', estado: 'activo', limiteCredito: 25000, saldoPendiente: 0, metodoPagoPreferido: 'transferencia', createdAt: new Date().toISOString() },
    { nombre: 'Doña Mari', telefono: '555-1003', estado: 'activo', limiteCredito: 3000, saldoPendiente: 0, metodoPagoPreferido: 'efectivo', createdAt: new Date().toISOString() },
    { nombre: 'Público General', telefono: '000-0000', estado: 'activo', limiteCredito: 0, saldoPendiente: 0, metodoPagoPreferido: 'efectivo', createdAt: new Date().toISOString() }
  ];

  const cliIds = await db.clientes.bulkAdd(clientesBase, { allKeys: true });
  const cliRecords = clientesBase.map((c, i) => ({ ...c, id: cliIds[i] }));

  // 4. Entidades Base: Productos
  const productosBase = [
    { nombre: 'Diezmillo de Res', categoria: 'Res', unidad: 'KG', estado: 'Fresco', precioCompra: 120, precioVenta: 180, stock: 0, stockMinimo: 20, createdAt: new Date().toISOString() },
    { nombre: 'Pechuga de Pollo', categoria: 'Pollo', unidad: 'KG', estado: 'Fresco', precioCompra: 65, precioVenta: 95, stock: 0, stockMinimo: 30, createdAt: new Date().toISOString() },
    { nombre: 'Ribeye Prime', categoria: 'Res', unidad: 'KG', estado: 'Congelado', precioCompra: 300, precioVenta: 450, stock: 0, stockMinimo: 10, createdAt: new Date().toISOString() },
    { nombre: 'Chorizo Español', categoria: 'Cerdo', unidad: 'KG', estado: 'Procesado', precioCompra: 80, precioVenta: 130, stock: 0, stockMinimo: 15, createdAt: new Date().toISOString() },
    { nombre: 'Manteca de Cerdo', categoria: 'Abarrotes', unidad: 'KG', estado: 'Procesado', precioCompra: 40, precioVenta: 60, stock: 0, stockMinimo: 10, createdAt: new Date().toISOString() }
  ];

  const prodIds = await db.productos.bulkAdd(productosBase, { allKeys: true });
  const prodRecords = productosBase.map((p, i) => ({ ...p, id: prodIds[i] }));
  prodRecords.forEach(p => p.provAsignado = provRecords[Math.floor(Math.random() * provRecords.length)]);

  // 5. Simulación de Compras (Stock y Deuda)
  const comprasAInsertar = [];
  const facturasProvAInsertar = [];
  
  for (let i = 0; i < 40; i++) {
    const prod = prodRecords[Math.floor(Math.random() * prodRecords.length)];
    const prov = prod.provAsignado;
    const cantidad = Math.floor(Math.random() * 50) + 20;
    const totalCompra = cantidad * prod.precioCompra;
    const tipo = Math.random() > 0.4 ? 'credito' : 'contado';
    const fechaCompra = getRandomDate();
    const idLocal = 1000 + i;

    comprasAInsertar.push({
      idLocal,
      productoId: prod.id,
      productoNombre: prod.nombre,
      proveedorId: prov.id,
      proveedorNombre: prov.nombre,
      cantidad: cantidad,
      unidad: prod.unidad,
      precioCompra: prod.precioCompra,
      precioVenta: prod.precioVenta,
      tipoCompra: tipo,
      total: totalCompra,
      fecha: fechaCompra,
      createdAt: fechaCompra
    });

    prod.stock += cantidad;

    if (tipo === 'credito') {
      prov.saldoPendiente += totalCompra;
      facturasProvAInsertar.push({
        numeroFactura: `FA-${new Date().getFullYear()}-${idLocal}`,
        proveedorId: prov.id,
        cliente: { nombre: prov.nombre, telefono: prov.telefono }, // UI espera objeto cliente
        productos: [{ nombre: prod.nombre, cantidad: cantidad, unidad: prod.unidad, precioUnitario: prod.precioCompra }], // UI espera arreglo de productos
        compraId: idLocal,
        fecha: fechaCompra, // Propiedad vital para UI
        fechaEmision: fechaCompra,
        subtotal: Number(totalCompra), // Asegurando Number
        total: Number(totalCompra),    // Asegurando Number
        montoTotal: Number(totalCompra), 
        saldoPendiente: Number(totalCompra), // Asegurando Number
        estado: 'pendiente',
        createdAt: fechaCompra
      });
    }
  }

  await db.compras.bulkAdd(comprasAInsertar);
  await db.facturas.bulkAdd(facturasProvAInsertar);

  // 6. Abonos y Gastos de Proveedores
  const gastosAInsertar = [];
  const abonosAInsertar = [];

  for (const compra of comprasAInsertar) {
    if (compra.tipoCompra === 'contado') {
      gastosAInsertar.push({
        categoria: 'Compra de Mercancía',
        descripcion: `Compra al contado: ${compra.cantidad} ${compra.unidad} de ${compra.productoNombre}`,
        monto: compra.total,
        proveedorId: compra.proveedorId,
        proveedor: compra.proveedorNombre,
        fecha: compra.fecha,
        createdAt: compra.fecha
      });
    }
  }

  for (const prov of provRecords) {
    if (prov.saldoPendiente > 0) {
      const numAbonos = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < numAbonos; j++) {
        const montoAbono = Math.min(prov.saldoPendiente, Math.floor(Math.random() * 5000) + 1000);
        const fechaAbono = getRandomDate();
        
        abonosAInsertar.push({
          proveedorId: prov.id,
          proveedorNombre: prov.nombre,
          monto: montoAbono,
          metodoPago: 'efectivo',
          notas: 'Abono autogenerado',
          fecha: fechaAbono,
          createdAt: fechaAbono
        });

        gastosAInsertar.push({
          categoria: 'Pago a Proveedor',
          descripcion: `Abono a línea de crédito de ${prov.nombre}`,
          monto: montoAbono,
          proveedorId: prov.id,
          proveedor: prov.nombre,
          fecha: fechaAbono,
          createdAt: fechaAbono
        });

        prov.saldoPendiente -= montoAbono;
        if (prov.saldoPendiente < 0) prov.saldoPendiente = 0;
      }
    }
  }

  // Gastos Adicionales de Operación Diaria (Nómina, Luz, etc)
  const gastosOperativosBase = [
    { categoria: 'Servicios', descripcion: 'Pago de recibo de CFE (Gas / Luz)', min: 500, max: 2000 },
    { categoria: 'Nómina', descripcion: 'Pago semanal sueldos ayudantes', min: 2500, max: 5000 },
    { categoria: 'Mantenimiento', descripcion: 'Mantenimiento preventivo rebanadora', min: 800, max: 1500 },
    { categoria: 'Insumos', descripcion: 'Compra de bolsas, rollo para emplayar y etiquetas', min: 300, max: 1000 }
  ];

  for (let g = 0; g < 15; g++) {
    const tipoGasto = gastosOperativosBase[Math.floor(Math.random() * gastosOperativosBase.length)];
    const montoGasto = Math.floor(Math.random() * (tipoGasto.max - tipoGasto.min)) + tipoGasto.min;
    const fechaGasto = getRandomDate();
    
    gastosAInsertar.push({
      categoria: tipoGasto.categoria,
      descripcion: tipoGasto.descripcion,
      monto: Number(montoGasto),
      proveedorId: null,
      proveedor: 'Operación Interna',
      fecha: fechaGasto,
      createdAt: fechaGasto
    });
  }

  await db.abonos.bulkAdd(abonosAInsertar);
  await db.gastos.bulkAdd(gastosAInsertar);

  // 7. Simulación de Ventas y Cuentas por Cobrar
  const ventasAInsertar = [];
  const facturasCliAInsertar = [];
  
  for (let i = 0; i < 150; i++) {
    const cli = cliRecords[Math.floor(Math.random() * cliRecords.length)];
    const numItems = Math.floor(Math.random() * 4) + 1;
    
    const carrito = [];
    let totalPago = 0;
    let utilidadRealVenta = 0;

    for (let j = 0; j < numItems; j++) {
      const prod = prodRecords[Math.floor(Math.random() * prodRecords.length)];
      const maxVenta = Math.min(prod.stock, 5); 
      if (maxVenta <= 0) continue; 
      
      const cantidad = Math.floor(Math.random() * maxVenta) + 1;
      const subtotal = prod.precioVenta * cantidad;
      
      carrito.push({
        productoId: prod.id,
        nombre: prod.nombre,
        cantidad: cantidad,
        unidad: prod.unidad,
        precioUnitario: prod.precioVenta,
        precioCompraHistorico: prod.precioCompra,
        importe: subtotal,
        subtotal: subtotal
      });
      
      totalPago += subtotal;
      utilidadRealVenta += (prod.precioVenta - prod.precioCompra) * cantidad;
      prod.stock -= cantidad; 
    }

    if (carrito.length === 0) continue;

    const isCredito = (Math.random() > 0.8 && cli.nombre !== 'Público General');
    const metodo = isCredito ? 'credito' : cli.metodoPagoPreferido;
    const estado = isCredito ? 'pendiente' : 'pagado';
    const fechaVenta = getRandomDate();

    ventasAInsertar.push({
      clienteId: cli.id,
      clienteNombre: cli.nombre,
      productos: carrito,
      total: totalPago,
      estado: estado,
      metodoPago: metodo,
      utilidadReal: utilidadRealVenta,
      fecha: fechaVenta,
      createdAt: fechaVenta
    });

    if (isCredito) {
      cli.saldoPendiente += totalPago;
      facturasCliAInsertar.push({
         numeroFactura: `F-${new Date().getFullYear()}-${1000 + i}`,
         clienteId: cli.id,
         clienteNombre: cli.nombre,
         cliente: { nombre: cli.nombre, telefono: cli.telefono, direccion: 'Conocido' }, // UI espera objeto cliente
         productos: carrito, // UI espera arreglo de productos
         fecha: fechaVenta, // Propiedad vital para UI
         subtotal: Number(totalPago), // Asegurar que sea Float nativo
         total: Number(totalPago),
         saldoPendiente: Number(totalPago), // Para homologación de UX
         saldo: Number(totalPago),
         tipo: 'venta_credito',
         estado: 'pendiente',
         fechaEmision: fechaVenta,
         fechaVencimiento: new Date(new Date(fechaVenta).getTime() + (15 * 24 * 60 * 60 * 1000)).toISOString(),
         createdAt: fechaVenta
      });
    }
  }

  await db.ventas.bulkAdd(ventasAInsertar);
  await db.facturas.bulkAdd(facturasCliAInsertar);

  // 8. Actualizar las colecciones base (Stocks y Saldos Finales)
  const prodUpdates = prodRecords.map(p => {
    const { provAsignado, ...cleanP } = p;
    return cleanP;
  });

  await db.productos.bulkPut(prodUpdates);
  await db.proveedores.bulkPut(provRecords);
  await db.clientes.bulkPut(cliRecords);

  console.log("✅ Seeder V2 terminado. Flujo relacional del ERP inyectado exitosamente.");
}
