import styles from '../../app/ventas/ventas.module.css';
import { InventoryService } from '@/lib/services/inventoryService';
import { formatearMoneda, formatearNumero } from '@/lib/numberToText';

/**
 * Componente visual (Dumb Component / StatelessWidget) para el catálogo de productos.
 * 
 * @param {Array} productosFiltrados - Lista de productos ya filtrados listos para dibujarse
 * @param {Function} onAgregarAlCarrito - Callback cuando el usuario toca la tarjeta
 */
export const ProductCatalog = ({ productosFiltrados, onAgregarAlCarrito }) => {
  return (
    <div className={styles.productosGrid}>
      {productosFiltrados.map((producto) => (
        <div
          key={producto.id}
          className={`${styles.productoCard} ${producto.stock <= 0 ? styles.sinStock : ''}`}
          onClick={() => onAgregarAlCarrito(producto)}
        >
          {producto.imagenURL ? (
            <img
              src={producto.imagenURL}
              alt={producto.nombre}
              className={styles.productoImg}
            />
          ) : (
            <span className={styles.productoEmoji}>
              {InventoryService.getCategoriaIcon(producto.categoria)}
            </span>
          )}
          <div className={styles.productoInfo}>
            <span className={styles.productoNombre}>{producto.nombre}</span>
            <span className={styles.productoPrecio}>{formatearMoneda(producto.precioVenta)}</span>
          </div>
          <span className={`${styles.stockBadge} ${producto.stock <= producto.stockMinimo ? styles.bajo : ''}`}>
            {formatearNumero(producto.stock)} {producto.unidad}
          </span>
        </div>
      ))}
    </div>
  );
};
