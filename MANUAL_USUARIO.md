# Manual de Usuario - Sistema de Punto de Venta Carnicería

## Módulo de Ventas

El módulo de ventas permite registrar transacciones de venta, seleccionar clientes, gestionar inventario y generar facturas automáticamente.

### Pasos para registrar una venta:
1.  **Seleccionar Cliente**: Busque al cliente por nombre o teléfono en la barra de búsqueda. Si es un cliente nuevo, agréguelo desde el módulo de Clientes.
    - **Dirección de Entrega**: Al seleccionar un cliente, se cargará automáticamente su dirección de entrega registrada. Puede modificarla manualmente para esta venta específica si es necesario.
2.  **Agregar Productos**: Busque productos y agréguelos al carrito.
    - El sistema validará automáticamente si hay stock disponible.
3.  **Método de Pago**: Seleccione el método de pago (Contado, Crédito, Transferencia).
    - **Crédito**: Si selecciona Crédito, el sistema actualizará el saldo pendiente del cliente.
4.  **Procesar Venta**: Haga clic en "Cobrar". Se generará automáticamente una factura/nota de venta.

## Módulo de Facturación

El sistema genera comprobantes de venta con formato profesional A4, optimizados para impresión clara y completa.

### Visualización e Impresión:
- Al completar una venta, verá una vista previa de la factura.
- **Botón "Descargar PDF"**: Guarda el archivo en su dispositivo.
- **Botón "Imprimir"**: Abre el diálogo de impresión del navegador.
- **Formato**: El diseño está optimizado para hojas tamaño carta (A4). Asegúrese de configurar su impresora en tamaño carta/A4 y escala al 100% o "Ajustar a página" si su impresora lo requiere.
- **Información Incluida**:
  - Datos del cliente y dirección de entrega correcta.
  - Método de pago real seleccionado.
  - Desglose de productos y totales.
  - Pagaré (si aplica) con datos legales.

## Módulo de Clientes

Gestione la información de sus clientes, incluyendo direcciones múltiples y estado de cuenta.

### Gestión de Clientes:
- **Dirección Principal**: Domicilio fiscal del cliente.
- **Dirección de Entrega**: Domicilio opcional para envíos. Si se deja en blanco, el sistema usará la dirección principal.
- **Crédito**: Configure el límite de crédito y días de plazo.

## Solución de Problemas Comunes

- **La dirección de entrega no aparece**: Verifique que el cliente tenga una dirección de entrega registrada. Si no, el sistema usará la dirección principal.
- **La factura se corta al imprimir**: Asegúrese de usar papel tamaño carta/A4 y que los márgenes de impresión estén configurados correctamente (mínimo 5mm).
