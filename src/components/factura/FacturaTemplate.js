'use client';

import React from 'react';
import styles from './FacturaTemplate.module.css';

// Función helper para formatear precios con comas (ej: $1,234.56)
const formatPrecio = (cantidad) => {
  const num = Number(cantidad) || 0;
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

import { numeroALetras } from '../../lib/numberToText';

// ... (Rest of formatPrecio remains same) ... 
// Correction: I need to replace the WHOLE function including helper if I want to be clean, or just replace the function body.
// Better to replace lines 13-57 with the new logic.
// AND replace lines 250-278 with new Pagaré.
// Since these are far apart, I should use multi_replace_file_content if possible, or just two calls.
// Checking line numbers again. 
// numeroALetras is 13-57.
// Pagaré is 250-278.
// I will use replace_file_content for numeroALetras first.


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
      telefono: ''
    },
    productos = [],
    subtotal = 0,
    iva = 0,
    total = 0,
    buenoFor = 0
  } = factura || {};

  // Determinar título según tipo de factura
  const tituloNota = tipoFactura === 'credito' ? 'NOTA DE CRÉDITO' : 'NOTA DE CONTADO';

  const calcularSubtotal = () => {
    return productos.reduce((sum, p) => sum + (p.cantidad * p.precioUnitario), 0);
  };

  const calculatedSubtotal = subtotal || calcularSubtotal();
  const calculatedIva = iva || (calculatedSubtotal * 0.16);
  const calculatedTotal = total || (calculatedSubtotal + calculatedIva);

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
            <p className={styles.empresaCP}>CP: 36960</p>
          </div>
        </div>

        {/* Panel derecho - Nota de Crédito */}
        <div className={styles.notaCreditoPanel}>
          <div className={styles.notaCreditoTitulo}>{tituloNota}</div>
          <div className={styles.notaCreditoInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FOLIO #:</span>
              <span className={styles.infoValue}>{numeroFactura}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FECHA DE EMISIÓN:</span>
              <span className={styles.infoValue}>{fechaEmision}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>EXPEDIDA EN:</span>
              <span className={styles.infoValue}>{expedidaEn}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>FECHA DE VENCIMIENTO:</span>
              <span className={styles.infoValue}>{fechaVencimiento}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>MÉTODO DE PAGO:</span>
              <span className={styles.infoValue}>{metodoPago}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>PLAZO DE PAGO (DÍAS):</span>
              <span className={styles.infoValue}>{plazoPago}</span>
            </div>
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
            <span className={styles.clienteValue}>{cliente.codigo}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>NOMBRE:</span>
            <span className={styles.clienteValue}>{cliente.nombre}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>DIRECCIÓN:</span>
            <span className={styles.clienteValue}>{cliente.direccion}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>C.P:</span>
            <span className={styles.clienteValue}>{cliente.cp}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>R.F.C/CURP:</span>
            <span className={styles.clienteValue}>{cliente.rfc}</span>
          </div>
          <div className={styles.clienteRow}>
            <span className={styles.clienteLabel}>TEL / CEL:</span>
            <span className={styles.clienteValue}>{cliente.telefono}</span>
          </div>
        </div>
        <div className={styles.vendedorInfo}>
          <div className={styles.vendedorRow}>
            <span className={styles.vendedorLabel}>M. N. MIN:</span>
            <span className={styles.vendedorValue}></span>
          </div>
          <div className={styles.vendedorRow}>
            <span className={styles.vendedorLabel}>VENDEDOR:</span>
            <span className={styles.vendedorValue}>{vendedor}</span>
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
                <td className={styles.tdCentro}>{producto.codigo}</td>
                <td className={styles.tdCentro}>{producto.unidad || 'PZA'}</td>
                <td className={styles.tdDescripcion}>{producto.descripcion}</td>
                <td className={styles.tdDerecha}>{formatPrecio(producto.precioUnitario)}</td>
                <td className={styles.tdDerecha}>{formatPrecio(producto.cantidad * producto.precioUnitario)}</td>
              </tr>
            ))}
            {/* Filas vacías para completar la tabla */}
            {Array.from({ length: Math.max(0, 8 - productos.length) }).map((_, i) => (
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
          <div className={styles.importeLetraLabel}>IMPORTE</div>
          <div className={styles.importeLetraTexto}>
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
            <span className={styles.totalValue}>{formatPrecio(calculatedSubtotal)}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN PAGARÉ */}
      <div className={styles.pagareSection}>
        <div className={styles.qrContainer}>
          <img src="/qrcode.png" alt="QR Code" className={styles.qrCode} />
        </div>
        <div className={styles.pagareContent}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 className={styles.pagareTitulo}>PAGARÉ</h2>
          </div>
          
          <p className={styles.pagareTexto} style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            EN CUERÁMARO, GUANAJUATO A {fechaVencimiento || fechaEmision}
          </p>
          
          <p className={styles.pagareTexto} style={{ textAlign: 'justify', lineHeight: '1.5', fontSize: '9px', textTransform: 'uppercase' }}>
            DEBO Y PAGARÉ INCONDICIONALMENTE POR ESTE PAGARÉ A LA ORDEN DE <strong>FRANCISCO JAVIER PANTOJA RANGEL</strong> 
            EN CUERÁMARO, GUANAJUATO EL {fechaVencimiento || fechaEmision}.
            <br/><br/>
            LA CANTIDAD DE: <strong>{formatPrecio(buenoFor || calculatedTotal)} ({numeroALetras(buenoFor || calculatedTotal)})</strong>
            <br/><br/>
            VALOR RECIBIDO A MI ENTERA SATISFACCIÓN. ESTE PAGARÉ ES MERCANTIL Y ESTÁ REGIDO 
            POR LA LEY GENERAL DE TÍTULOS Y OPERACIONES DE CRÉDITO EN SUS ARTÍCULOS 170 , 171, 172 Y DEMÁS RELATIVOS, 
            Y TODOS ESTÁN SUJETOS A LA CONDICIÓN DE QUE, AL NO PAGARSE CUALQUIERA DE ELLOS A SU VENCIMIENTO, 
            SERÁN EXIGIBLES TODOS LOS QUE LES SIGAN EN NÚMERO, ADEMÁS DE YA VENCIDOS, DESDE LA FECHA DE VENCIMIENTO 
            DE ESTE DOCUMENTO HASTA EL DÍA DE SU LIQUIDACIÓN, CAUSARA INTERESES MORATORIOS AL TIPO DE 3 % MENSUAL, 
            PAGADERO EN ESTE CIUDAD JUNTAMENTE CON EL PRINCIPAL.
          </p>

          <div style={{ marginTop: '30px', borderTop: '2px solid #333', paddingTop: '5px' }}>
             <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
               <tbody>
                 <tr>
                   <td style={{ width: '150px', fontWeight: 'bold', padding: '2px' }}>NOMBRE:</td>
                   <td style={{ borderBottom: '1px solid #999', padding: '2px' }}>{cliente.nombre}</td>
                 </tr>
                 <tr>
                    <td style={{ fontWeight: 'bold', padding: '2px' }}>DOMICILIO:</td>
                    <td style={{ borderBottom: '1px solid #999', padding: '2px' }}>{cliente.direccion}</td>
                 </tr>
                 <tr>
                    <td style={{ fontWeight: 'bold', padding: '2px' }}>CIUDAD:</td>
                    <td style={{ borderBottom: '1px solid #999', padding: '2px' }}>LEÓN, GUANAJUATO, MÉXICO</td>
                 </tr>
               </tbody>
             </table>
          </div>

          <div className={styles.firmaSection} style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={styles.firmaLinea} style={{ width: '250px', borderBottom: '1px solid #333', marginBottom: '8px' }}></div>
            <p className={styles.firmaTexto} style={{ fontWeight: 'bold' }}>NOMBRE Y FIRMA</p>
            <p className={styles.firmaTexto} style={{ marginTop: '5px', fontSize: '8px' }}>ACEPTO(AMOS) Y PAGARÉ(EMOS) A SU VENCIMIENTO</p>
            
            <div style={{ width: '100%', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start', paddingLeft: '20px' }}>
               <div style={{ display: 'flex', width: '90%', borderBottom: '1px solid #ccc', fontSize: '9px' }}>
                 <span style={{ fontWeight: 'bold', width: '60px' }}>NOMBRE:</span>
                 <span style={{ paddingLeft: '5px' }}>{cliente.nombre}</span>
               </div>
               <div style={{ display: 'flex', width: '90%', borderBottom: '1px solid #ccc', fontSize: '9px' }}>
                 <span style={{ fontWeight: 'bold', width: '60px' }}>DOMICILIO:</span>
                 <span style={{ paddingLeft: '5px' }}>{cliente.direccion}</span>
               </div>
               <div style={{ display: 'flex', width: '90%', borderBottom: '1px solid #ccc', fontSize: '9px' }}>
                 <span style={{ fontWeight: 'bold', width: '60px' }}>CIUDAD:</span>
                 <span style={{ paddingLeft: '5px' }}>CUERÁMARO, GUANAJUATO</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje Legal SAT */}
      <div className={styles.mensajeLegal}>
        Este comprobante corresponde a una nota de venta y no es una factura fiscal ante el SAT.
      </div>
    </div>
  );
}
