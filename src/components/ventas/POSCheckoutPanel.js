import styles from '../../app/ventas/ventas.module.css';
import { formatearMoneda } from '@/lib/numberToText';

/**
 * Componente visual (Dumb Component / StatelessWidget) para el Panel de Pagos y Totales.
 */
export const POSCheckoutPanel = ({
  metodoPago,
  tipoFactura,
  fechaVencimiento,
  direccionEntrega,
  clienteSeleccionado,
  subtotal,
  total,
  procesando,
  carritoLength,
  onMetodoPagoChange,
  onTipoFacturaChange,
  onFechaVencimientoChange,
  onLimpiar,
  onProcesar
}) => {
  return (
    <>
      {/* Método de pago */}
      <div className={styles.metodoPagoSection}>
        <label>💳 Método de Pago</label>
        <div className={styles.metodoPagoOptions}>
          <button
            className={`${styles.metodoPagoBtn} ${metodoPago === 'contado' ? styles.active : ''}`}
            onClick={() => { onMetodoPagoChange('contado'); onTipoFacturaChange('debito'); }}
          >
            💵 Contado
          </button>
          <button
            className={`${styles.metodoPagoBtn} ${metodoPago === 'credito' ? styles.active : ''}`}
            onClick={() => { onMetodoPagoChange('credito'); onTipoFacturaChange('credito'); }}
          >
            💳 Crédito
          </button>
          <button
            className={`${styles.metodoPagoBtn} ${metodoPago === 'transferencia' ? styles.active : ''}`}
            onClick={() => { onMetodoPagoChange('transferencia'); onTipoFacturaChange('debito'); }}
          >
            🏦 Transferencia
          </button>
        </div>
      </div>

      {/* Tipo de Factura */}
      <div className={styles.metodoPagoSection}>
        <label>📄 Tipo de Factura</label>
        <div className={styles.metodoPagoOptions}>
          <button
            className={`${styles.metodoPagoBtn} ${tipoFactura === 'debito' ? styles.active : ''}`}
            onClick={() => onTipoFacturaChange('debito')}
          >
            ⚡ Débito (Hoy)
          </button>
          <button
            className={`${styles.metodoPagoBtn} ${tipoFactura === 'credito' ? styles.active : ''}`}
            onClick={() => onTipoFacturaChange('credito')}
          >
            📅 Crédito (Plazo)
          </button>
        </div>
      </div>

      {/* Fecha de Vencimiento (solo para crédito) */}
      {tipoFactura === 'credito' && (
        <div className={styles.metodoPagoSection}>
          <label>📅 Fecha de Vencimiento</label>
          <input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => onFechaVencimientoChange(e.target.value)}
            min={new Date().toLocaleDateString('en-CA')} // Formato YYYY-MM-DD local
            className={styles.dateInput}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
          />
        </div>
      )}

      {/* Dirección de Entrega */}
      <div className={styles.metodoPagoSection}>
        <label>📍 Dirección de Entrega</label>
        <input
          type="text"
          value={direccionEntrega}
          readOnly
          placeholder={clienteSeleccionado ? (clienteSeleccionado.direccionEntrega || "Sin dirección de entrega registrada") : "Selecciona un cliente"}
          className={styles.dateInput}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#666' }}
        />
        {clienteSeleccionado && (
          <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Por defecto: {clienteSeleccionado.direccion || 'Sin dirección'}
          </small>
        )}
      </div>

      {/* Totales */}
      <div className={styles.totalesSection}>
        <div className={styles.totalRow}>
          <span>Subtotal:</span>
          <span>{formatearMoneda(subtotal)}</span>
        </div>
        <div className={`${styles.totalRow} ${styles.totalFinal}`}>
          <span>Total:</span>
          <span>{formatearMoneda(total)}</span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className={styles.accionesSection}>
        <button
          className={styles.btnLimpiar}
          onClick={onLimpiar}
        >
          🗑️ Limpiar
        </button>
        <button
          className={styles.btnProcesar}
          onClick={onProcesar}
          disabled={procesando || carritoLength === 0}
        >
          {procesando ? '⏳ Procesando...' : '✅ Cobrar'}
        </button>
      </div>
    </>
  );
};
