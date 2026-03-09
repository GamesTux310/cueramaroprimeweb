'use client';

import React from 'react';
import styles from './FacturaTemplate.module.css';
import { numeroALetras } from '../../lib/numberToText';

// Función helper para formatear precios con comas (ej: $1,234.56)
const formatPrecio = (cantidad) => {
  const num = Number(cantidad) || 0;
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function FacturaTemplate({ factura, mostrarParaImpresion = false }) {
  const {
    numeroFactura = 'F-2026-001',
    fechaEmision = new Date().toLocaleDateString('es-MX'),
    fechaVencimiento = '',
    expedidaEn = 'CUERAMARO, GUANAJUATO',
    metodoPago = 'TRANSFERENCIA/EFECTIVO/DEPÓSITO',
    plazoPago = '30 DÍAS',
    tipoFactura = 'debito', // debito o credito
    vendedor = 'OSCAR PANTOJA',
    cliente = {
      codigo: '',
      nombre: '',
      direccion: '',
      cp: '',
      rfc: '',
      telefono: '',
      ciudad: '',
      direccionEntrega: ''
    },
    productos = [],
    subtotal = 0,
    iva = 0,
    total = 0,
    buenoFor = 0
  } = factura || {};

  // Helper para mayúsculas seguras
  const toUpper = (valor) => {
    if (valor === null || valor === undefined) return '';
    return String(valor).toUpperCase();
  };

  // Determinar título según tipo de factura
  const esAbono = tipoFactura === 'abono';
  const tituloNota = esAbono ? 'NOTA DE ABONO' : (tipoFactura === 'credito' ? 'NOTA DE CRÉDITO' : 'NOTA DE CONTADO');

  const calcularSubtotal = () => {
    return productos.reduce((sum, p) => sum + (p.cantidad * p.precioUnitario), 0);
  };

  const calculatedSubtotal = subtotal || calcularSubtotal();
  // IVA eliminado por requerimiento
  const calculatedTotal = total || calculatedSubtotal;

  // Lógica de llenado de celdas vacías (similar a Excel)
  const filasMaximas = 10;
  const filasVacias = Math.max(0, filasMaximas - (productos ? productos.length : 0));

  return (
    <div id="factura-template" className={`${styles.facturaContainer} ${mostrarParaImpresion ? styles.paraImpresion : ''}`}>
      {/* ENCABEZADO */}
      <div className={styles.header}>
        {/* Logo y datos empresa */}
        <div className={styles.empresaInfo}>
          <div className={styles.logoContainer}>
            <img src="/logo.png" alt="Logo" className={styles.logo} />
          </div>
          <div className={styles.empresaDatos}>
            <h1 className={styles.empresaNombre}>CARNICERÍA CUERÁMARO PRIME</h1>
            <p className={styles.empresaDireccion}>CUERÁMARO, GUANAJUATO, MÉXICO</p>
            <p className={styles.empresaColonia}>COLONIA CUERÁMARO CENTRO</p>
          </div>
        </div>

        {/* Panel derecho - Nota de Crédito */}
        <div className={styles.notaCreditoPanel}>
          <div className={styles.notaCreditoTitulo}>{tituloNota}</div>
          <div className={styles.notaCreditoInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FOLIO #:</span>
              <span className={styles.infoValue}>{toUpper(numeroFactura)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FECHA DE EMISIÓN:</span>
              <span className={styles.infoValue}>{toUpper(fechaEmision)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>EXPEDIDA EN:</span>
              <span className={styles.infoValue}>{toUpper(expedidaEn)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FECHA DE VENCIMIENTO:</span>
              <span className={styles.infoValue}>{toUpper(fechaVencimiento)}</span>
            </div>
            <div className={styles.infoRow} style={{ padding: '5px 0', borderBottom: '2px solid #d0e8f8' }}>
              <span className={styles.infoLabel}>MÉTODO DE PAGO:</span>
              <span className={styles.infoValue} style={{ color: '#000' }}>{toUpper(metodoPago) || 'TRANSFERENCIA/EFECTIVO/DEPÓSITO'}</span>
            </div>
            {!esAbono && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>PLAZO DE PAGO (DÍAS):</span>
                <span className={styles.infoValue}>{toUpper(plazoPago)}</span>
              </div>
            )}
            {esAbono && factura.facturasAfectadas && factura.facturasAfectadas.length > 0 && (
              <div className={styles.infoRow} style={{ background: '#fef3c7', padding: '6px 8px', borderRadius: '4px', marginTop: '4px' }}>
                <span className={styles.infoLabel} style={{ color: '#92400e' }}>ABONO APLICADO A FOLIO(S):</span>
                <span className={styles.infoValue} style={{ color: '#92400e', fontWeight: 'bold' }}>{factura.facturasAfectadas.join(', ')}</span>
              </div>
            )}
            {esAbono && factura.saldoAnterior !== undefined && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>SALDO ANTERIOR:</span>
                  <span className={styles.infoValue}>{formatPrecio(factura.saldoAnterior)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>NUEVO SALDO:</span>
                  <span className={styles.infoValue}>{formatPrecio(factura.saldoNuevo)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DATOS DEL CLIENTE */}
      <div className={styles.clienteSection}>
        <div className={styles.clienteTitulo}>
          {'DATOS DEL CLIENTE'.split('').map((char, i) => (
            <span key={i}>{char === ' ' ? '\u00A0' : char}</span>
          ))}
        </div>
        <div className={styles.clienteGrid}>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>CÓDIGO:</span>
            <span className={styles.clienteValue}>{toUpper(cliente.codigo)}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>NOMBRE:</span>
            <span className={styles.clienteValue}>{toUpper(cliente.nombre)}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>DIRECCIÓN:</span>
            <span className={styles.clienteValue}>{toUpper(cliente.direccion)}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>R.F.C/CURP:</span>
            <span className={styles.clienteValue}>{toUpper(cliente.rfc)}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>TEL / CEL:</span>
            <span className={styles.clienteValue}>{toUpper(cliente.telefono)}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>DIRECCIÓN DE ENTREGA:</span>
            <span className={styles.clienteValue}>{toUpper(cliente.direccionEntrega)}</span>
          </div>
        </div>
        <div className={styles.vendedorInfo}>
          <div className={styles.vendedorRow}>
            <span className={styles.vendedorLabel}>VENDEDOR:</span>
            <span className={styles.vendedorValue}>{toUpper(vendedor)}</span>
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className={styles.productosSection}>
        <table className={styles.productosTable}>
          <thead>
            <tr>
              <th className={styles.thCantidad}>CANTIDAD</th>
              <th className={styles.thCodigo}>CÓDIGO</th>
              <th className={styles.thUM}>U.M.</th>
              <th className={styles.thDescripcion}>DESCRIPCIÓN</th>
              <th className={styles.thPrecio}>PRECIO</th>
              <th className={styles.thImporte}>IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto, index) => (
              <tr key={index}>
                <td className={styles.tdCentro}>{producto.cantidad}</td>
                <td className={styles.tdCentro}>{toUpper(producto.codigo)}</td>
                <td className={styles.tdCentro}>{toUpper(producto.unidad || 'PZA')}</td>
                <td className={styles.tdDescripcion}>{toUpper(producto.descripcion)}</td>
                <td className={styles.tdDerecha}>{formatPrecio(producto.precioUnitario)}</td>
                <td className={styles.tdDerecha}>{formatPrecio(producto.cantidad * producto.precioUnitario)}</td>
              </tr>
            ))}
            {/* Filas vacías para rellenar la factura como en Excel */}
            {Array.from({ length: filasVacias }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className={styles.tdCentro}>&nbsp;</td>
                <td className={styles.tdCentro}></td>
                <td className={styles.tdCentro}></td>
                <td className={styles.tdDescripcion}></td>
                <td className={styles.tdDerecha}></td>
                <td className={styles.tdDerecha}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALES E IMPORTE CON LETRA */}
      <div className={styles.totalesSection}>
        <div className={styles.importeLetra}>
          <div className={styles.qrContainer}>
            <img src="/qrcode.png" alt="QR Code" className={styles.qrCode} />
          </div>
          <div className={styles.importeLetraTexto}>
            <span className={styles.importeLabel}>IMPORTE</span>
            <span className={styles.conLetra}>CON LETRA:</span>
            <span className={styles.letraValor}>{numeroALetras(calculatedTotal)}</span>
          </div>
        </div>
        <div className={styles.totalesBox}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>SUBTOTAL</span>
            <span className={styles.totalValue}>{formatPrecio(calculatedSubtotal)}</span>
          </div>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>TOTAL</span>
            <span className={styles.totalValue}>{formatPrecio(calculatedTotal)}</span>
          </div>
          </div>
        </div>

      {/* SECCIÓN PAGARÉ - Solo para ventas normales, NO para abonos */}
      {!esAbono && (
      <div className={styles.pagareSection}>
        <div className={styles.pagareContent}>
          
          {/* Header Pagaré: Título + Bueno Por */}
          <div className={styles.pagareHeader}>
            <div className={styles.pagareTituloBox}>
              <h2 className={styles.pagareTitulo}>PAGARÉ</h2>
            </div>
            <div className={styles.buenoPorBox}>
              <span className={styles.buenoPorLabel}>BUENO POR:</span>
              <span className={styles.buenoPorValue}>{formatPrecio(buenoFor || calculatedTotal)}</span>
            </div>
          </div>
          
          {(() => {
             const ciudadEmision = 'CUERÁMARO, GUANAJUATO';
             const ciudadManual = cliente.ciudad && cliente.ciudad.trim().length > 0 ? cliente.ciudad.toUpperCase() : null;
             let ciudadClienteCompleta = ciudadManual;
             if (!ciudadClienteCompleta) {
                 const direccionUpper = (cliente.direccion || '').toUpperCase();
                 let ciudadCliente = 'CUERÁMARO';
                 if (direccionUpper.includes('LEÓN') || direccionUpper.includes('LEON')) ciudadCliente = 'LEÓN';
                 else if (direccionUpper.includes('IRAPUATO')) ciudadCliente = 'IRAPUATO';
                 else if (direccionUpper.includes('PÉNJAMO') || direccionUpper.includes('PENJAMO')) ciudadCliente = 'PÉNJAMO';
                 else if (direccionUpper.includes('ABASOLO')) ciudadCliente = 'ABASOLO';
                 else if (direccionUpper.includes('SILAO')) ciudadCliente = 'SILAO';
                 else if (direccionUpper.includes('SALAMANCA')) ciudadCliente = 'SALAMANCA';
                 else if (direccionUpper.includes('ROMITA')) ciudadCliente = 'ROMITA';
                 else if (direccionUpper.includes('MANUEL DOBLADO')) ciudadCliente = 'CD. MANUEL DOBLADO';
                 ciudadClienteCompleta = `${ciudadCliente}, GUANAJUATO`;
             }
             return (
               <>
                  <p className={styles.pagareTexto} style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    EN {ciudadEmision} A {toUpper(fechaEmision)}
                  </p>
                  <p className={styles.pagareTexto} style={{ textAlign: 'justify', lineHeight: '1.5', fontSize: '9px', textTransform: 'uppercase' }}>
                    DEBO Y PAGARÉ INCONDICIONALMENTE POR ESTE PAGARÉ A LA ORDEN DE <strong>FRANCISCO JAVIER PANTOJA RANGEL</strong> 
                    <br/>EN {ciudadEmision} EL {toUpper(fechaVencimiento)}.
                    <br/><br/>
                    LA CANTIDAD DE: <strong>{formatPrecio(buenoFor || calculatedTotal)} ({numeroALetras(buenoFor || calculatedTotal)})</strong>
                    <br/><br/>
                    VALOR RECIBIDO A MI ENTERA SATISFACCIÓN. ESTE PAGARÉ ES MERCANTIL Y ESTÁ REGIDO 
                    POR LA LEY GENERAL DE TÍTULOS Y OPERACIONES DE CRÉDITO EN SUS ARTÍCULOS 170 , 171, 172 Y DEMÁS RELATIVOS, 
                    Y TODOS ESTÁN SUJETOS A LA CONDICIÓN DE QUE, AL NO PAGARSE CUALQUIERA DE ELLOS A SU VENCIMIENTO, 
                    SERÁN EXIGIBLES TODOS LOS QUE LES SIGAN EN NÚMERO, ADEMÁS DE YA VENCIDOS, DESDE LA FECHA DE VENCIMIENTO 
                    DE ESTE DOCUMENTO HASTA EL DÍA DE SU LIQUIDACIÓN, CAUSARA INTERESES MORATORIOS AL TIPO DE 3 % MENSUAL, 
                    PAGADERO EN ESTA CIUDAD JUNTAMENTE CON EL PRINCIPAL.
                  </p>
                  <div className={styles.firmaDatos}>
                    <div className={styles.firmaRow}>
                      <span className={styles.firmaLabel}>NOMBRE:</span>
                      <span className={styles.firmaValue}>{toUpper(cliente.nombre)}</span>
                    </div>
                    <div className={styles.firmaRow}>
                      <span className={styles.firmaLabel}>DOMICILIO:</span>
                      <span className={styles.firmaValue}>{toUpper(cliente.direccion)}</span>
                    </div>
                    <div className={styles.firmaRow}>
                      <span className={styles.firmaLabel}>CIUDAD:</span>
                      <span className={styles.firmaValue}>{ciudadClienteCompleta}</span>
                    </div>
                  </div>
                  <div className={styles.firmaSection}>
                    <div className={styles.firmaLinea}></div>
                    <p className={styles.firmaTexto}>NOMBRE Y FIRMA</p>
                    <p className={styles.aceptoTexto}>ACEPTO Y PAGARÉ A SU VENCIMIENTO</p>
                  </div>
                  <p className={styles.suscribeTexto}>
                    ESTE PAGARÉ SE SUSCRIBE EN LA CIUDAD DE {ciudadEmision} EL DÍA {toUpper(fechaEmision)}
                  </p>
               </>
             );
          })()}
        </div>
      </div>
      )}

      {/* Mensaje Legal SAT */}
      <div className={styles.mensajeLegal}>
        ESTE COMPROBANTE CORRESPONDE A UNA NOTA DE VENTA Y NO ES UNA FACTURA FISCAL ANTE EL SAT.
      </div>
    </div>
  );
}
