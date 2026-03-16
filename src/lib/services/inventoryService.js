/**
 * Módulo puro encargado de las reglas de negocio del Inventario 
 * (Clean Code - Business Logic Layer).
 */
export const InventoryService = {
  /**
   * Obtiene el ícono representativo de una categoría de producto.
   * @param {string} categoria - Nombre de la categoría (ej: 'Res', 'Cerdo')
   * @returns {string} Emoji representativo
   */
  getCategoriaIcon: (categoria) => {
    const iconos = {
      'Res': '🥩',
      'Cerdo': '🐷',
      'Pollo': '🍗',
      'Embutidos': '🌭',
    };
    return iconos[categoria] || '📦';
  },

  /**
   * Filtra la lista de productos basada en un término de búsqueda y una categoría específica.
   * 
   * @param {Array} productos - Todos los productos
   * @param {string} busquedaProducto - Término buscado por el usuario
   * @param {string} filtroCategoria - Categoría seleccionada (ej: 'Todas', 'Res')
   * @returns {Array} Lista filtrada de productos listos para renderizar
   */
  filtrarProductos: (productos, busquedaProducto = '', filtroCategoria = 'Todas') => {
    if (!productos || !Array.isArray(productos)) return [];
    
    return productos.filter(p => {
      const coincideBusqueda = (p.nombre || '').toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        (p.categoria || '').toLowerCase().includes(busquedaProducto.toLowerCase());
      
      const coincideCategoria = filtroCategoria === 'Todas' ||
        (p.categoria && p.categoria.toLowerCase() === filtroCategoria.toLowerCase());
      
      return coincideBusqueda && coincideCategoria;
    });
  },

  /**
   * Valida si la inserción de una nueva cantidad al carrito excede el stock disponible.
   * @param {number} cantidadDeseada - Lo que el usuario intenta agregar
   * @param {number} stockActual - El inventario disponible en base de datos
   * @returns {boolean} True si es válido, False si excede
   */
  validarDisponibilidad: (cantidadDeseada, stockActual) => {
    return cantidadDeseada <= stockActual;
  },
  
  /**
   * Analiza el estado del stock general para determinar si requiere reabastecimiento crítico.
   * @param {number} stockActual
   * @param {number} stockMinimo
   * @returns {string} 'critico', 'bajo', 'optimo'
   */
  evaluarNivelStock: (stockActual, stockMinimo = 5) => {
    if (stockActual <= 0) return 'agotado';
    if (stockActual <= stockMinimo) return 'bajo';
    return 'optimo';
  }
};
