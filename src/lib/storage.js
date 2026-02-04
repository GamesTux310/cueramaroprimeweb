// ========================================
// Sistema de Almacenamiento Local
// ========================================

// Datos iniciales de ejemplo
const datosInicialesClientes = [
  {
    id: 1,
    nombre: 'Juan Pérez García',
    telefono: '462-123-4567',
    direccion: 'Calle Hidalgo #123, Centro',
    cp: '36960',
    rfc: 'PEJU800101ABC',
    email: 'juan.perez@email.com',
    tipoCliente: 'credito',
    diasCredito: 15,
    saldoPendiente: 2500,
    ultimaCompra: '2026-01-30',
    estado: 'activo',
    credencialURL: null,
    comprobanteURL: null,
    fechaRegistro: '2024-06-15',
  },
  {
    id: 2,
    nombre: 'María López Hernández',
    telefono: '462-987-6543',
    direccion: 'Av. Juárez #456, Col. Centro',
    cp: '36960',
    rfc: '',
    email: 'maria.lopez@email.com',
    tipoCliente: 'contado',
    diasCredito: 0,
    saldoPendiente: 0,
    ultimaCompra: '2026-01-29',
    estado: 'activo',
    credencialURL: null,
    comprobanteURL: null,
    fechaRegistro: '2024-07-20',
  },
  {
    id: 3,
    nombre: 'Carlos Rodríguez Martínez',
    telefono: '462-555-1234',
    direccion: 'Calle Morelos #789, Col. Norte',
    cp: '36960',
    rfc: 'ROMC900505XYZ',
    email: 'carlos.rod@email.com',
    tipoCliente: 'credito',
    diasCredito: 7,
    saldoPendiente: 5800,
    ultimaCompra: '2026-01-25',
    estado: 'atrasado',
    credencialURL: null,
    comprobanteURL: null,
    fechaRegistro: '2024-05-10',
  },
];

const datosInicialesProductos = [
  {
    id: 1,
    nombre: 'Bistec de Res',
    categoria: 'Res',
    unidad: 'kg',
    precioCompra: 120,
    precioVenta: 180,
    stock: 25,
    stockMinimo: 10,
    descripcion: 'Corte de res premium',
    imagenURL: null,
    estado: 'Fresco',
  },
  {
    id: 2,
    nombre: 'Costilla de Cerdo',
    categoria: 'Cerdo',
    unidad: 'kg',
    precioCompra: 85,
    precioVenta: 130,
    stock: 18,
    stockMinimo: 8,
    descripcion: 'Costilla fresca de cerdo',
    imagenURL: null,
    estado: 'Fresco',
  },
  {
    id: 3,
    nombre: 'Pechuga de Pollo',
    categoria: 'Pollo',
    unidad: 'kg',
    precioCompra: 65,
    precioVenta: 95,
    stock: 5,
    stockMinimo: 15,
    descripcion: 'Pechuga sin hueso',
    imagenURL: null,
    estado: 'Fresco',
  },
  {
    id: 4,
    nombre: 'Chorizo Casero',
    categoria: 'Embutidos',
    unidad: 'kg',
    precioCompra: 100,
    precioVenta: 160,
    stock: 12,
    stockMinimo: 5,
    descripcion: 'Chorizo artesanal',
    imagenURL: null,
    estado: 'Fresco',
  },
  {
    id: 5,
    nombre: 'Molida de Res',
    categoria: 'Res',
    unidad: 'kg',
    precioCompra: 95,
    precioVenta: 145,
    stock: 3,
    stockMinimo: 10,
    descripcion: 'Carne molida especial',
    imagenURL: null,
    estado: 'Fresco',
  },
];

const datosInicialesProveedores = [
  {
    id: 1,
    nombre: 'Carnes del Bajío S.A.',
    contacto: 'Pedro Sánchez',
    telefono: '462-555-0001',
    email: 'ventas@carnesbajio.com',
    direccion: 'Zona Industrial, Irapuato',
    productos: ['Res'],
    estado: 'inactivo',
    notas: 'Suspendido temporalmente',
    ofreceCredito: false,
    diasCredito: 0,
    imagenURL: null,
  },
  {
    id: 2,
    nombre: 'Avícola Guanajuato',
    contacto: 'Laura Martínez',
    telefono: '462-555-0002',
    email: 'pedidos@avicolaguanajuato.com',
    direccion: 'Carretera León km 5',
    productos: ['Pollo'],
    estado: 'activo',
  },
];

// ========================================
// Funciones de Almacenamiento
// ========================================

const STORAGE_KEYS = {
  CLIENTES: 'cueramaro_clientes',
  PRODUCTOS: 'cueramaro_productos',
  PROVEEDORES: 'cueramaro_proveedores',
  VENTAS: 'cueramaro_ventas',
  GASTOS: 'cueramaro_gastos',
  ABONOS: 'cueramaro_abonos',
  FACTURAS: 'cueramaro_facturas',
  NOTAS: 'cueramaro_notas',
  COMPRAS: 'cueramaro_compras',
  LOTES: 'cueramaro_lotes', // 🆕 PEPS - Lotes de inventario
};

const datosInicialesNotas = [
  {
    id: 1,
    titulo: '👋 Bienvenida',
    contenido: 'Usa este espacio para anotar recordatorios, pendientes o ideas rápidas. \n\nPuedes cambiar el color de las notas para organizarte mejor.',
    fecha: new Date().toISOString(),
    color: '#ffedd5', // orange
  }
];

// Verificar si estamos en el cliente
const isClient = typeof window !== 'undefined';

// ========================================
// Clientes
// ========================================
export function getClientes() {
  if (!isClient) return datosInicialesClientes;
  
  const data = localStorage.getItem(STORAGE_KEYS.CLIENTES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(datosInicialesClientes));
    return datosInicialesClientes;
  }
  return JSON.parse(data);
}

export function saveClientes(clientes) {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));
}

export function addCliente(cliente) {
  const clientes = getClientes();
  const nuevoId = Math.max(...clientes.map(c => c.id), 0) + 1;
  const nuevoCliente = {
    ...cliente,
    id: nuevoId,
    fechaRegistro: new Date().toISOString().split('T')[0],
    ultimaCompra: null,
    saldoPendiente: 0,
  };
  clientes.push(nuevoCliente);
  saveClientes(clientes);
  return nuevoCliente;
}

export function updateCliente(id, datosActualizados) {
  const clientes = getClientes();
  const index = clientes.findIndex(c => c.id === id);
  if (index !== -1) {
    clientes[index] = { ...clientes[index], ...datosActualizados };
    saveClientes(clientes);
    return clientes[index];
  }
  return null;
}

export function deleteCliente(id) {
  const clientes = getClientes();
  const clientesFiltrados = clientes.filter(c => c.id !== id);
  saveClientes(clientesFiltrados);
}

// ========================================
// Productos
// ========================================
export function getProductos() {
  if (!isClient) return datosInicialesProductos;
  
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCTOS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(datosInicialesProductos));
    return datosInicialesProductos;
  }
  return JSON.parse(data);
}

export function saveProductos(productos) {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productos));
}

export function addProducto(producto) {
  const productos = getProductos();
  const nuevoId = Math.max(...productos.map(p => p.id), 0) + 1;
  const nuevoProducto = {
    ...producto,
    id: nuevoId,
  };
  productos.push(nuevoProducto);
  saveProductos(productos);
  return nuevoProducto;
}

export function updateProducto(id, datosActualizados) {
  const productos = getProductos();
  const index = productos.findIndex(p => p.id === id);
  if (index !== -1) {
    productos[index] = { ...productos[index], ...datosActualizados };
    saveProductos(productos);
    return productos[index];
  }
  return null;
}

export function deleteProducto(id) {
  const productos = getProductos();
  const productosFiltrados = productos.filter(p => p.id !== id);
  saveProductos(productosFiltrados);
}

export function actualizarStock(id, cantidad, tipo = 'agregar') {
  const productos = getProductos();
  const index = productos.findIndex(p => p.id === id);
  if (index !== -1) {
    if (tipo === 'agregar') {
      productos[index].stock += cantidad;
    } else if (tipo === 'restar') {
      productos[index].stock = Math.max(0, productos[index].stock - cantidad);
    }
    saveProductos(productos);
    return productos[index];
  }
  return null;
}

// ========================================
// Proveedores
// ========================================
export function getProveedores() {
  if (!isClient) return datosInicialesProveedores;
  
  const data = localStorage.getItem(STORAGE_KEYS.PROVEEDORES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PROVEEDORES, JSON.stringify(datosInicialesProveedores));
    return datosInicialesProveedores;
  }
  return JSON.parse(data);
}

export function saveProveedores(proveedores) {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.PROVEEDORES, JSON.stringify(proveedores));
}

export function addProveedor(proveedor) {
  const proveedores = getProveedores();
  const nuevoId = Math.max(...proveedores.map(p => p.id), 0) + 1;
  const nuevoProveedor = {
    ...proveedor,
    id: nuevoId,
    estado: 'activo',
  };
  proveedores.push(nuevoProveedor);
  saveProveedores(proveedores);
  return nuevoProveedor;
}

export function updateProveedor(id, datosActualizados) {
  const proveedores = getProveedores();
  const index = proveedores.findIndex(p => p.id === id);
  if (index !== -1) {
    proveedores[index] = { ...proveedores[index], ...datosActualizados };
    saveProveedores(proveedores);
    return proveedores[index];
  }
  return null;
}

// ========================================
// Ventas
// ========================================
export function getVentas() {
  if (!isClient) return [];
  
  const data = localStorage.getItem(STORAGE_KEYS.VENTAS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function saveVentas(ventas) {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.VENTAS, JSON.stringify(ventas));
}

export function addVenta(venta) {
  const ventas = getVentas();
  const nuevoId = Math.max(...ventas.map(v => v.id), 0) + 1;
  
  // 🆕 PEPS: Consumir lotes para cada producto y calcular costo real
  let costoTotalReal = 0;
  const productosConLotes = venta.productos.map(item => {
    const lotesConsumidos = consumirLotes(item.productoId, item.cantidad);
    const costoItem = lotesConsumidos.reduce((sum, l) => sum + l.costoTotal, 0);
    costoTotalReal += costoItem;
    
    return {
      ...item,
      lotesConsumidos, // Desglose de lotes usados
      costoReal: costoItem, // Costo total basado en lotes
    };
  });
  
  const nuevaVenta = {
    ...venta,
    id: nuevoId,
    fecha: new Date().toISOString(),
    productos: productosConLotes, // Productos con info de lotes
    costoTotalReal, // 🆕 Costo real basado en PEPS
    utilidadReal: venta.total - costoTotalReal, // 🆕 Ganancia exacta
  };
  ventas.push(nuevaVenta);
  saveVentas(ventas);
  
  // Actualizar stock de productos (para compatibilidad con UI existente)
  venta.productos.forEach(item => {
    actualizarStock(item.productoId, item.cantidad, 'restar');
  });
  
  // Si es a crédito, actualizar saldo del cliente
  if (venta.tipo === 'credito') {
    updateCliente(venta.clienteId, {
      saldoPendiente: (getClientes().find(c => c.id === venta.clienteId)?.saldoPendiente || 0) + venta.total,
      ultimaCompra: nuevaVenta.fecha.split('T')[0],
    });
  }
  
  return nuevaVenta;
}

export function deleteVenta(id) {
  const ventas = getVentas();
  const ventasFiltradas = ventas.filter(v => v.id !== id);
  saveVentas(ventasFiltradas);
}

// ========================================
// Abonos
// ========================================
export function getAbonos() {
  if (!isClient) return [];
  
  const data = localStorage.getItem(STORAGE_KEYS.ABONOS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ABONOS, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function addAbono(abono) {
  const abonos = getAbonos();
  const nuevoId = Math.max(...abonos.map(a => a.id), 0) + 1;
  
  // Generar número de abono único
  const año = new Date().getFullYear();
  const abonosDelAño = abonos.filter(a => a.numeroAbono && a.numeroAbono.startsWith(`ABONO-${año}`));
  const ultimoNumero = abonosDelAño.length > 0
    ? Math.max(...abonosDelAño.map(a => {
        const partes = a.numeroAbono.split('-');
        return parseInt(partes[2]) || 0;
      }))
    : 0;
  const numeroAbono = `ABONO-${año}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
  
  const nuevoAbono = {
    ...abono,
    id: nuevoId,
    numeroAbono,
    fecha: new Date().toISOString(),
    comprobanteURL: abono.comprobanteURL || null, // Para adjuntar comprobante
  };
  abonos.push(nuevoAbono);
  if (isClient) {
    localStorage.setItem(STORAGE_KEYS.ABONOS, JSON.stringify(abonos));
  }
  
  // Actualizar saldo del cliente
  const cliente = getClientes().find(c => c.id === abono.clienteId);
  if (cliente) {
    const nuevoSaldo = Math.max(0, cliente.saldoPendiente - abono.monto);
    updateCliente(abono.clienteId, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoSaldo === 0 ? 'activo' : cliente.estado,
    });
  }

  // 🆕 Actualizar saldo de la FACTURA/NOTA específica
  if (abono.facturaAsociadaId) {
    const facturas = getFacturas();
    const facturaIndex = facturas.findIndex(f => f.id === abono.facturaAsociadaId);
    
    if (facturaIndex !== -1) {
      const factura = facturas[facturaIndex];
      // Si no tiene saldoPendiente, asumimos que es el total (primera vez)
      const saldoActualFactura = factura.saldoPendiente !== undefined ? factura.saldoPendiente : factura.total;
      const nuevoSaldoFactura = Math.max(0, saldoActualFactura - abono.monto);
      
      facturas[facturaIndex] = {
        ...factura,
        saldoPendiente: nuevoSaldoFactura,
        estado: nuevoSaldoFactura <= 0.1 ? 'pagado' : 'pendiente' // Margen de error pequeño
      };
      
      saveFacturas(facturas);
    }
  }
  
  // 🆕 Generar factura de abono automáticamente
  const facturaAbono = addFacturaAbono({
    abonoId: nuevoId,
    numeroAbono,
    clienteId: abono.clienteId,
    clienteNombre: abono.clienteNombre,
    monto: abono.monto,
    metodoPago: abono.metodoPago,
    saldoAnterior: abono.saldoAnterior,
    saldoNuevo: abono.saldoNuevo,
  });
  
  nuevoAbono.facturaId = facturaAbono.id;
  nuevoAbono.numeroFactura = facturaAbono.numeroFactura;
  
  // Actualizar abono con referencia a factura
  const abonosActualizados = getAbonos();
  const idx = abonosActualizados.findIndex(a => a.id === nuevoId);
  if (idx !== -1) {
    abonosActualizados[idx] = nuevoAbono;
    if (isClient) {
      localStorage.setItem(STORAGE_KEYS.ABONOS, JSON.stringify(abonosActualizados));
    }
  }
  
  return nuevoAbono;
}

// Nueva función para crear factura de abono
export function addFacturaAbono(abonoData) {
  const facturas = getFacturas();
  const nuevoId = Math.max(...facturas.map(f => f.id), 0) + 1;
  const año = new Date().getFullYear();
  
  // Generar número de factura de abono
  const facturasAbono = facturas.filter(f => f.numeroFactura && f.numeroFactura.startsWith(`FA-${año}`));
  const ultimoNumero = facturasAbono.length > 0
    ? Math.max(...facturasAbono.map(f => {
        const partes = f.numeroFactura.split('-');
        return parseInt(partes[2]) || 0;
      }))
    : 0;
  const numeroFactura = `FA-${año}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
  
  const fechaHoy = new Date().toISOString().split('T')[0];
  
  const nuevaFactura = {
    id: nuevoId,
    numeroFactura,
    tipoFactura: 'abono',
    abonoId: abonoData.abonoId,
    numeroAbono: abonoData.numeroAbono,
    fechaEmision: fechaHoy,
    fecha: fechaHoy,
    fechaCreacion: new Date().toISOString(),
    expedidaEn: 'CUERÁMARO, GUANAJUATO',
    metodoPago: abonoData.metodoPago === 'efectivo' ? 'EFECTIVO' : 
                abonoData.metodoPago === 'tarjeta' ? 'TARJETA' : 'TRANSFERENCIA',
    vendedor: 'OSCAR PANTOJA',
    cliente: {
      codigo: `CLI-${String(abonoData.clienteId).padStart(3, '0')}`,
      nombre: abonoData.clienteNombre,
    },
    productos: [{
      cantidad: 1,
      codigo: abonoData.numeroAbono,
      unidad: 'PAGO',
      descripcion: `ABONO A CUENTA - ${abonoData.metodoPago.toUpperCase()}`,
      precioUnitario: abonoData.monto,
      importe: abonoData.monto,
    }],
    subtotal: abonoData.monto,
    total: abonoData.monto,
    estado: 'pagado',
    saldoAnterior: abonoData.saldoAnterior,
    saldoNuevo: abonoData.saldoNuevo,
  };
  
  facturas.push(nuevaFactura);
  saveFacturas(facturas);
  return nuevaFactura;
}

// ========================================
// Gastos
// ========================================
export function getGastos() {
  if (!isClient) return [];
  
  const data = localStorage.getItem(STORAGE_KEYS.GASTOS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function addGasto(gasto) {
  const gastos = getGastos();
  const nuevoId = Math.max(...gastos.map(g => g.id), 0) + 1;
  const nuevoGasto = {
    ...gasto,
    id: nuevoId,
    fecha: new Date().toISOString(),
  };
  gastos.push(nuevoGasto);
  if (isClient) {
    localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(gastos));
  }
  return nuevoGasto;
}

export function deleteGasto(id) {
  const gastos = getGastos();
  const gastosFiltrados = gastos.filter(g => g.id !== id);
  if (isClient) {
    localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(gastosFiltrados));
  }
}

// ========================================
// Facturas
// ========================================
export function getFacturas() {
  if (!isClient) return [];
  
  const data = localStorage.getItem(STORAGE_KEYS.FACTURAS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function saveFacturas(facturas) {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(facturas));
}

export function generarNumeroFactura() {
  const facturas = getFacturas();
  const año = new Date().getFullYear();
  
  // Filtrar facturas del año actual
  const facturasDelAño = facturas.filter(f => f.numeroFactura.startsWith(`F-${año}`));
  
  // Obtener el siguiente número
  const ultimoNumero = facturasDelAño.length > 0
    ? Math.max(...facturasDelAño.map(f => {
        const partes = f.numeroFactura.split('-');
        return parseInt(partes[2]) || 0;
      }))
    : 0;
  
  const siguienteNumero = (ultimoNumero + 1).toString().padStart(3, '0');
  return `F-${año}-${siguienteNumero}`;
}

export function addFactura(facturaData) {
  const facturas = getFacturas();
  const nuevoId = Math.max(...facturas.map(f => f.id), 0) + 1;
  
  const nuevaFactura = {
    ...facturaData,
    id: nuevoId,
    numeroFactura: generarNumeroFactura(),
    fecha: new Date().toISOString().split('T')[0],
    fechaCreacion: new Date().toISOString(),
  };
  
  facturas.push(nuevaFactura);
  saveFacturas(facturas);
  return nuevaFactura;
}

export function updateFactura(id, datosActualizados) {
  const facturas = getFacturas();
  const index = facturas.findIndex(f => f.id === id);
  if (index !== -1) {
    facturas[index] = { ...facturas[index], ...datosActualizados };
    saveFacturas(facturas);
    return facturas[index];
  }
  return null;
}

export function deleteFactura(id) {
  const facturas = getFacturas();
  const facturasFiltradas = facturas.filter(f => f.id !== id);
  saveFacturas(facturasFiltradas);
}

// ========================================
// Notas
// ========================================
export function getNotas() {
  if (!isClient) return datosInicialesNotas;
  
  const data = localStorage.getItem(STORAGE_KEYS.NOTAS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(datosInicialesNotas));
    return datosInicialesNotas;
  }
  return JSON.parse(data);
}

export function saveNotas(notas) {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.NOTAS, JSON.stringify(notas));
}

export function addNota(nota) {
  const notas = getNotas();
  const nuevoId = Math.max(...notas.map(n => n.id), 0) + 1;
  const nuevaNota = {
    ...nota,
    id: nuevoId,
    fecha: new Date().toISOString(),
  };
  notas.unshift(nuevaNota); // Agregar al inicio
  saveNotas(notas);
  return nuevaNota;
}

export function updateNota(id, datosActualizados) {
  const notas = getNotas();
  const index = notas.findIndex(n => n.id === id);
  if (index !== -1) {
    notas[index] = { ...notas[index], ...datosActualizados };
    saveNotas(notas);
    return notas[index];
  }
  return null;
}

export function deleteNota(id) {
  const notas = getNotas();
  const notasFiltradas = notas.filter(n => n.id !== id);
  saveNotas(notasFiltradas);
}

// ========================================
// Lotes de Inventario (PEPS/FIFO)
// ========================================
export function getLotes(productoId = null) {
  if (!isClient) return [];
  
  const data = localStorage.getItem(STORAGE_KEYS.LOTES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify([]));
    return [];
  }
  
  const lotes = JSON.parse(data);
  
  // Si se especifica productoId, filtrar solo lotes de ese producto
  if (productoId !== null) {
    return lotes
      .filter(l => l.productoId === productoId && l.cantidadRestante > 0)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Ordenar por fecha (más antiguo primero)
  }
  
  return lotes;
}

export function saveLotes(lotes) {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotes));
  } catch (error) {
    console.error('Error saving lotes:', error);
    // Si es error de quota, limpiar adjuntos grandes
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      const lotesLimpios = lotes.map(l => ({ ...l, adjuntoURL: null }));
      localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotesLimpios));
      throw new Error('Almacenamiento lleno. El adjunto fue removido.');
    }
    throw error;
  }
}

export function addLote(lote) {
  const lotes = getLotes();
  const nuevoId = Math.max(...lotes.map(l => l.id), 0) + 1;
  
  const nuevoLote = {
    id: nuevoId,
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
    adjuntoURL: lote.adjuntoURL || null, // 🆕 Foto/PDF de factura
  };
  
  lotes.push(nuevoLote);
  saveLotes(lotes);
  return nuevoLote;
}

// 🆕 PEPS: Consumir lotes del más antiguo al más nuevo
export function consumirLotes(productoId, cantidadAConsumir) {
  const lotesProducto = getLotes(productoId); // Ya ordenados por fecha
  const todosLotes = getLotes();
  
  let restante = cantidadAConsumir;
  const lotesConsumidos = [];
  
  for (const lote of lotesProducto) {
    if (restante <= 0) break;
    
    const consumir = Math.min(lote.cantidadRestante, restante);
    
    if (consumir > 0) {
      lotesConsumidos.push({
        loteId: lote.id,
        cantidadConsumida: consumir,
        precioCompra: lote.precioCompra,
        costoTotal: consumir * lote.precioCompra,
      });
      
      // Actualizar lote en la lista completa
      const idx = todosLotes.findIndex(l => l.id === lote.id);
      if (idx !== -1) {
        todosLotes[idx].cantidadRestante -= consumir;
      }
      
      restante -= consumir;
    }
  }
  
  // Guardar cambios
  saveLotes(todosLotes);
  
  // Si quedó restante sin asignar, significa que no había suficiente stock en lotes
  // (esto puede pasar con inventario "legacy" previo a PEPS)
  if (restante > 0) {
    lotesConsumidos.push({
      loteId: null, // Sin lote asignado (legacy)
      cantidadConsumida: restante,
      precioCompra: 0, // Costo desconocido
      costoTotal: 0,
      nota: 'Stock sin lote asignado (previo a PEPS)'
    });
  }
  
  return lotesConsumidos;
}

// 🆕 Obtener stock real basado en lotes activos
export function getStockReal(productoId) {
  const lotesProducto = getLotes(productoId);
  return lotesProducto.reduce((sum, lote) => sum + lote.cantidadRestante, 0);
}

// ========================================
// Compras (Historial de Abastecimiento)
// ========================================
export function getCompras() {
  if (!isClient) return [];
  
  const data = localStorage.getItem(STORAGE_KEYS.COMPRAS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function saveCompras(compras) {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(compras));
  } catch (error) {
    console.error('Error saving compras:', error);
    // Si es error de quota, limpiar adjuntos grandes
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      const comprasLimpias = compras.map(c => ({ ...c, adjuntoURL: null }));
      localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(comprasLimpias));
      throw new Error('Almacenamiento lleno. El adjunto fue removido.');
    }
    throw error;
  }
}

export function addCompra(compra) {
  const compras = getCompras();
  const nuevoId = Math.max(...compras.map(c => c.id), 0) + 1;
  const total = compra.precioCompra * compra.cantidad;
  
  // Calcular margen histórico para este lote
  const margen = compra.precioCompra > 0 
    ? ((compra.precioVenta - compra.precioCompra) / compra.precioCompra) * 100 
    : 100;

  const nuevaCompra = {
    ...compra,
    id: nuevoId,
    fecha: new Date().toISOString(),
    margen: margen,
    total: total,
    adjuntoURL: compra.adjuntoURL || null, // 🆕 Adjunto de comprobante
  };
  
  compras.push(nuevaCompra);
  saveCompras(compras);

  // 🆕 Crear Lote PEPS
  addLote({
    productoId: compra.productoId,
    productoNombre: compra.productoNombre,
    proveedorId: compra.proveedorId,
    proveedorNombre: compra.proveedorNombre,
    precioCompra: compra.precioCompra,
    precioVenta: compra.precioVenta,
    cantidad: compra.cantidad,
    unidad: compra.unidad,
    compraId: nuevoId,
    adjuntoURL: compra.adjuntoURL || null,
  });

  // 🆕 Generar Gasto Automático
  addGasto({
    titulo: `Compra de Mercancía`,
    descripcion: `${compra.cantidad} ${compra.unidad || 'u'} de ${compra.productoNombre} a ${compra.proveedorNombre}`,
    monto: total,
    categoria: 'Mercancía',
    fecha: nuevaCompra.fecha
  });

  return nuevaCompra;
}

// ========================================
// Utilidades
// ========================================
export function resetearDatos() {
  if (!isClient) return;
  
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Reinicializar con datos de ejemplo
  getClientes();
  getProductos();
  getProveedores();
}

export function exportarDatos() {
  return {
    clientes: getClientes(),
    productos: getProductos(),
    proveedores: getProveedores(),
    ventas: getVentas(),
    gastos: getGastos(),
    abonos: getAbonos(),
    facturas: getFacturas(),
    exportadoEn: new Date().toISOString(),
  };
}

export function importarDatos(datos) {
  if (!isClient) return;
  
  if (datos.clientes) saveClientes(datos.clientes);
  if (datos.productos) saveProductos(datos.productos);
  if (datos.proveedores) saveProveedores(datos.proveedores);
  if (datos.ventas) saveVentas(datos.ventas);
  if (datos.gastos) localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(datos.gastos));
  if (datos.abonos) localStorage.setItem(STORAGE_KEYS.ABONOS, JSON.stringify(datos.abonos));
  if (datos.facturas) saveFacturas(datos.facturas);
}
