# Documentación Técnica - Sistema Punto de Venta Carnicería

## 1. Arquitectura del Sistema
El sistema está construido sobre **Next.js** (React) utilizando una arquitectura basada en componentes y servicios.

- **Frontend**: Next.js (App Router), CSS Modules.
- **Backend/Almacenamiento**: Firebase (configurado en `src/lib/firebase.js`) y LocalStorage para persistencia offline/local (`src/lib/storage.js`).
- **Generación de Documentos**: `jspdf` y `html2canvas` para generación de facturas en PDF.

## 2. Interacciones entre Módulos

### Módulo de Ventas (`src/app/ventas`)
- **Dependencias**:
  - `Clientes`: Lee información del cliente para autocompletar datos y verificar crédito.
  - `Productos`: Lee stock y precios. Actualiza el stock al confirmar venta.
  - `Facturas`: Genera un registro de factura automáticamente al completar la venta.

- **Flujo de Datos**:
  1. Selección de Cliente -> Carga `direccion` fiscal. La `direccionEntrega` se deja vacía para ingreso manual.
  2. Selección de Productos -> Verifica stock disponible.
  3. Confirmación -> 
     - Crea registro en `Ventas`.
     - Actualiza stock en `Productos`.
     - Actualiza saldo en `Clientes` (si es crédito).
     - Crea registro en `Facturas`.

### Módulo de Clientes (`src/app/clientes`)
- **Responsabilidad**: Gestión de datos maestros de clientes.
- **Datos Críticos**:
  - `direccion`: Dirección fiscal.
  - `saldoPendiente`: Acumulado de ventas a crédito.

### Módulo de Facturación (`src/app/facturas`, `src/components/factura`)
- **Responsabilidad**: Visualización e impresión de comprobantes.
- **Reglas de Negocio**:
  - **Dirección de Entrega**: Se toma exclusivamente del campo ingresado en la venta. Si está vacío, no se muestra.
  - **Método de Pago**: Debe reflejar la selección real en la venta (Transferencia, Efectivo, Crédito), no un valor estático.
  - **Formato**: Diseño A4 optimizado para evitar cortes en impresión. Se utiliza CSS `@media print` para ocultar elementos de UI.

## 3. Reglas de Integridad de Datos

1. **Direcciones**:
   - Al crear una venta, la dirección de entrega se inicializa vacía, permitiendo ingreso manual si es necesario.
   - El usuario puede modificarla manualmente para esa venta específica sin afectar el registro maestro del cliente.

2. **Stock**:
   - No se permite venta si `cantidad > stock`.
   - El stock se descuenta inmediatamente al confirmar la venta.

3. **Crédito**:
   - Las ventas a crédito aumentan el `saldoPendiente` del cliente.

## 4. Guía de Desarrollo y Mantenimiento

### Pruebas Unitarias
Se utiliza **Jest** y **React Testing Library**.
- Ejecutar pruebas: `npm test`
- Ubicación de pruebas: `__tests__` dentro de cada módulo o componente.
- **Requisito**: Todo cambio en lógica de negocio (cálculos, validaciones) debe incluir pruebas.

### Control de Versiones
- Ramas: `main` (producción), `develop` (desarrollo), `feature/*` (nuevas funcionalidades).
- Commits deben ser descriptivos.

### Prevención de Regresiones
- Antes de modificar `FacturaTemplate`, ejecutar `npm test` para asegurar que los campos críticos se renderizan correctamente.
- Verificar que los estilos globales no rompan el diseño de impresión.
