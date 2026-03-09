const { test, expect } = require('@playwright/test');

test.describe('Flujo Crítico ERP: Proveedor -> Compra Crédito -> Deuda', () => {

  test('Debe crear un proveedor, asignarle una compra a crédito y verificar la deuda', async ({ page }) => {
    // 1. Abrir la aplicación y navegar a Proveedores
    await page.goto('/');
    
    // Asumiendo que el sidebar tiene un link con texto "Proveedores" o href="/proveedores"
    await page.click('a[href="/proveedores"]');
    await expect(page).toHaveURL(/.*\/proveedores/);

    // 2. Crear un Proveedor de prueba
    const btnNuevoProveedor = page.locator('button', { hasText: 'Nuevo Proveedor' });
    await btnNuevoProveedor.waitFor({ state: 'visible' });
    await btnNuevoProveedor.click();

    // Llenar formulario de proveedor (ajusta los selectores según tu UI exacta)
    await page.fill('input[name="nombre"]', 'Ganadería Playwright');
    await page.fill('input[name="email"]', 'pw@test.com');
    await page.fill('input[name="telefono"]', '1234567890');
    // Guardar Proveedor
    await page.click('button:has-text("Guardar Proveedor")');
    
    // Esperar a que el modal se cierre (ej. el toast aparece o el modal desaparece)
    await expect(page.locator('text=Ganadería Playwright')).toBeVisible();

    // 3. Navegar a Productos e inyectar stock vía "Compra"
    await page.click('a[href="/productos"]');
    await expect(page).toHaveURL(/.*\/productos/);

    // (Opcional) Crear un producto rápido si no hay, asumiremos que existe uno llamado "Res" o creamos uno
    await page.click('button:has-text("Nuevo Producto")');
    await page.fill('input[name="nombre"]', 'Carne de Res PW');
    await page.fill('input[name="precioCompra"]', '100');
    await page.fill('input[name="precioVenta"]', '150');
    await page.click('button:has-text("Guardar Producto")');
    await expect(page.locator('text=Carne de Res PW')).toBeVisible();

    // Abrir Modal de Stock
    // Encontramos el botón "Agregar Stock" de ese producto específico
    const btnAgregarStock = page.locator('.productCard', { hasText: 'Carne de Res PW' })
                                .locator('button', { hasText: /Agregar/ });
    await btnAgregarStock.click();

    // 4. Llenar Modal de Stock marcando "Compra a Crédito"
    // Habilitar toggle "Es una compra al proveedor"
    await page.check('input[type="checkbox"]'); 
    
    // Seleccionar proveedor
    await page.selectOption('select[title="Proveedor"]', { label: 'Ganadería Playwright' });
    
    // Poner cantidad 100 kg
    await page.fill('input[placeholder="0.00"]', '100');
    
    // Marcar "A crédito"
    await page.check('input[value="credito"]');

    // Registrar Compra
    await page.click('button:has-text("Registrar Compra")');

    // Módulos ERP en el backend actualizarán. Validamos yendo a la vista de Proveedores de nuevo.
    await page.click('a[href="/proveedores"]');
    
    // 5. Verificar Deuda en la UI
    // El costo unitario era 100, la cantidad 100 => Deuda esperada: $10,000.00
    const cardProveedor = page.locator('.providerCard', { hasText: 'Ganadería Playwright' });
    await expect(cardProveedor).toBeVisible();
    
    // El DOM debe reflejar 10,000 
    const saldoPendiente = cardProveedor.locator('.saldoValue'); // o el selector específico
    await expect(saldoPendiente).toContainText('10,000');
  });

});
