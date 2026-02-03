'use client';

import { useState } from 'react';
import styles from '@/app/facturas/facturas.module.css';

export default function FormularioFacturaCompleto({ onSubmit, onCancel, clienteInicial = null }) {
  const [formData, setFormData] = useState({
    // Datos de la nota
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expedidaEn: 'CUERÁMARO, GUANAJUATO',
    motivoPago: 'VENTA DE MERCANCÍA',
    plazoPago: '30',
    moneda: 'M.N. MXN',
    vendedor: 'OSCAR PANTOJA',
    
    // Datos del cliente
    cliente: {
      codigo: clienteInicial?.id || '',
      nombre: clienteInicial?.nombre || '',
      direccion: clienteInicial?.direccion || '',
      cp: clienteInicial?.cp || '',
      rfc: clienteInicial?.rfc || '',
      telefono: clienteInicial?.telefono || '',
      direccionEntrega: clienteInicial?.direccion || ''
    },
    
    // Productos
    productos: [
      { cantidad: '', codigo: '', unidad: 'KG', nombre: '', precio: '' }
    ]
  });

  const agregarProducto = () => {
    setFormData({
      ...formData,
      productos: [...formData.productos, { cantidad: '', codigo: '', unidad: 'KG', nombre: '', precio: '' }]
    });
  };

  const eliminarProducto = (index) => {
    const nuevosProductos = formData.productos.filter((_, i) => i !== index);
    setFormData({ ...formData, productos: nuevosProductos });
  };

  const actualizarProducto = (index, campo, valor) => {
    const nuevosProductos = [...formData.productos];
    nuevosProductos[index] = { ...nuevosProductos[index], [campo]: valor };
    setFormData({ ...formData, productos: nuevosProductos });
  };

  const calcularTotales = () => {
    const subtotal = formData.productos.reduce((sum, p) => {
      const cantidad = parseFloat(p.cantidad) || 0;
      const precio = parseFloat(p.precio) || 0;
      return sum + (cantidad * precio);
    }, 0);
    
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    
    return { subtotal, iva, total };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { subtotal, iva, total } = calcularTotales();
    
    // Validar que haya al menos un producto
    const productosValidos = formData.productos.filter(p => 
      p.cantidad && p.nombre && p.precio
    );
    
    if (productosValidos.length === 0) {
      alert('Agrega al menos un producto válido');
      return;
    }
    
    // Convertir productos a números
    const productosConvertidos = productosValidos.map(p => ({
      cantidad: parseFloat(p.cantidad),
      codigo: p.codigo || '#0001',
      unidad: p.unidad,
      nombre: p.nombre,
      precio: parseFloat(p.precio)
    }));
    
    const facturaCompleta = {
      ...formData,
      productos: productosConvertidos,
      subtotal,
      iva,
      total
    };
    
    onSubmit(facturaCompleta);
  };

  const { subtotal, iva, total } = calcularTotales();

  return (
    <form className={styles.formularioCompleto} onSubmit={handleSubmit}>
      {/* Sección: Información de la Nota */}
      <div className={styles.formSection}>
        <h3>📄 Información de la Nota</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Fecha de Emisión</label>
            <input
              type="date"
              value={formData.fechaEmision}
              onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Fecha de Vencimiento</label>
            <input
              type="date"
              value={formData.fechaVencimiento}
              onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Expedida en</label>
            <input
              type="text"
              value={formData.expedidaEn}
              onChange={(e) => setFormData({ ...formData, expedidaEn: e.target.value })}
              placeholder="CUERÁMARO, GUANAJUATO"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Motivo de Pago</label>
            <input
              type="text"
              value={formData.motivoPago}
              onChange={(e) => setFormData({ ...formData, motivoPago: e.target.value })}
              placeholder="VENTA DE MERCANCÍA"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Plazo de Pago (días)</label>
            <input
              type="number"
              value={formData.plazoPago}
              onChange={(e) => setFormData({ ...formData, plazoPago: e.target.value })}
              min="1"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Moneda</label>
            <select
              value={formData.moneda}
              onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
            >
              <option value="M.N. MXN">M.N. MXN</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Vendedor</label>
            <input
              type="text"
              value={formData.vendedor}
              onChange={(e) => setFormData({ ...formData, vendedor: e.target.value })}
              placeholder="OSCAR PANTOJA"
            />
          </div>
        </div>
      </div>

      {/* Sección: Datos del Cliente */}
      <div className={styles.formSection}>
        <h3>👤 Datos del Cliente</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Código *</label>
            <input
              type="text"
              value={formData.cliente.codigo}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, codigo: e.target.value } 
              })}
              placeholder="#0001"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Nombre Completo *</label>
            <input
              type="text"
              value={formData.cliente.nombre}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, nombre: e.target.value } 
              })}
              required
              placeholder="Nombre del cliente"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Dirección</label>
            <input
              type="text"
              value={formData.cliente.direccion}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, direccion: e.target.value } 
              })}
              placeholder="Calle, número, colonia"
            />
          </div>
          <div className={styles.formGroup}>
            <label>C.P.</label>
            <input
              type="text"
              value={formData.cliente.cp}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, cp: e.target.value } 
              })}
              placeholder="36960"
            />
          </div>
          <div className={styles.formGroup}>
            <label>R.F.C.</label>
            <input
              type="text"
              value={formData.cliente.rfc}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, rfc: e.target.value } 
              })}
              placeholder="XAXX010101000"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Teléfono</label>
            <input
              type="tel"
              value={formData.cliente.telefono}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, telefono: e.target.value } 
              })}
              placeholder="462-123-4567"
            />
          </div>
          <div className={styles.formGroup} style={{gridColumn: 'span 2'}}>
            <label>Dirección de Entrega</label>
            <input
              type="text"
              value={formData.cliente.direccionEntrega}
              onChange={(e) => setFormData({ 
                ...formData, 
                cliente: { ...formData.cliente, direccionEntrega: e.target.value } 
              })}
              placeholder="Si es diferente a la dirección principal"
            />
          </div>
        </div>
      </div>

      {/* Sección: Productos */}
      <div className={styles.formSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>📦 Productos</h3>
          <button type="button" onClick={agregarProducto} className={styles.btnAddProduct}>
            ➕ Agregar Producto
          </button>
        </div>
        
        <div className={styles.productosTable}>
          <div className={styles.tablaHeaderRow}>
            <div className={styles.tablaCelda}>Cant.</div>
            <div className={styles.tablaCelda}>Código</div>
            <div className={styles.tablaCelda}>U.M.</div>
            <div className={styles.tablaCelda}>Descripción</div>
            <div className={styles.tablaCelda}>Precio</div>
            <div className={styles.tablaCelda}>Importe</div>
            <div className={styles.tablaCelda}>Acciones</div>
          </div>
          
          {formData.productos.map((producto, index) => (
            <div key={index} className={styles.tablaRow}>
              <div className={styles.tablaCelda}>
                <input
                  type="number"
                  value={producto.cantidad}
                  onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className={styles.tablaCelda}>
                <input
                  type="text"
                  value={producto.codigo}
                  onChange={(e) => actualizarProducto(index, 'codigo', e.target.value)}
                  placeholder="#0001"
                />
              </div>
              <div className={styles.tablaCelda}>
                <select
                  value={producto.unidad}
                  onChange={(e) => actualizarProducto(index, 'unidad', e.target.value)}
                >
                  <option value="KG">KG</option>
                  <option value="PZ">PZ</option>
                  <option value="LT">LT</option>
                  <option value="CJ">CJ</option>
                </select>
              </div>
              <div className={styles.tablaCelda}>
                <input
                  type="text"
                  value={producto.nombre}
                  onChange={(e) => actualizarProducto(index, 'nombre', e.target.value)}
                  placeholder="Descripción del producto"
                  required
                />
              </div>
              <div className={styles.tablaCelda}>
                <input
                  type="number"
                  value={producto.precio}
                  onChange={(e) => actualizarProducto(index, 'precio', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className={styles.tablaCelda}>
                ${((parseFloat(producto.cantidad) || 0) * (parseFloat(producto.precio) || 0)).toFixed(2)}
              </div>
              <div className={styles.tablaCelda}>
                {formData.productos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarProducto(index)}
                    className={styles.btnDeleteProduct}
                    title="Eliminar producto"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen de Totales */}
      <div className={styles.formSection}>
        <h3>💰 Resumen</h3>
        <div className={styles.resumenTotales}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>IVA (16%):</span>
            <span>${iva.toFixed(2)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.totalFinal}`}>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className={styles.modalFooter}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={styles.btnPrimary}>
          ✅ Generar Factura en Google Sheets
        </button>
      </div>
    </form>
  );
}
