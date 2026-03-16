import styles from '../../app/ventas/ventas.module.css';
import { formatearMoneda, parseDecimal } from '@/lib/numberToText';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

/**
 * Componente visual (Dumb Component / StatelessWidget) para el Carrito de Compras.
 * Se encarga puramente de renderizar los items elegidos y despachar eventos (clicks)
 * hacia el Controlador Padre sin almacenar estado interno.
 */
export const POSShoppingCart = ({
  carrito,
  onActualizarCantidad,
  onEliminarDelCarrito
}) => {
  return (
    <div className={styles.carritoItems}>
      <h3>🛒 Carrito ({carrito.length})</h3>
      {carrito.length === 0 ? (
        <div className={styles.carritoVacio}>
          <span>🛒</span>
          <p>Agrega productos al carrito</p>
        </div>
      ) : (
        <div className={styles.itemsList}>
          {carrito.map((item) => (
            <div key={item.id} className={styles.carritoItem}>
              <div className={styles.itemInfo}>
                <span className={styles.itemNombre}>{item.nombre}</span>
                <span className={styles.itemPrecio}>
                  {formatearMoneda(item.precioVenta)} / {item.unidad}
                </span>
              </div>
              <div className={styles.itemCantidad}>
                <button onClick={() => onActualizarCantidad(item.id, item.cantidad - 1)}>
                  −
                </button>
                <CurrencyInput
                  id={`input-qty-${item.id}`}
                  value={item.cantidad}
                  prefix=""
                  suffix={` ${item.unidad === 'PZA' ? 'PZ' : 'KG'}`}
                  placeholder="0.00"
                  onChange={(val) => onActualizarCantidad(item.id, val)}
                  style={{
                    width: '100px',
                    textAlign: 'center',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
                <button onClick={() => onActualizarCantidad(item.id, item.cantidad + 1)}>
                  +
                </button>
              </div>
              <div className={styles.itemSubtotal}>
                {formatearMoneda(item.precioVenta * parseDecimal(item.cantidad))}
              </div>
              <button
                className={styles.eliminarBtn}
                onClick={() => onEliminarDelCarrito(item.id)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
