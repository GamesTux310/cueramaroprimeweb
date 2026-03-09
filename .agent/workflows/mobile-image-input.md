---
description: Mobile file input pattern for images - always allow user to choose source
---

# Mobile Image Upload Pattern

## Rule: NEVER use `capture` attribute on file inputs

When implementing file/image upload inputs that need to work on mobile/tablet devices:

### ❌ WRONG - Forces camera only, no options

```jsx
<input
  type="file"
  accept="image/*"
  capture="environment" // ❌ This forces camera only!
  onChange={handleChange}
/>
```

### ✅ CORRECT - Lets user choose from camera/gallery/files

```jsx
<input
  type="file"
  accept="image/*" // or "image/*,application/pdf" for receipts
  onChange={handleChange}
/>
```

## Why This Matters

On mobile devices (iPad, iPhone, Android):

- **Without `capture`**: Browser shows options menu (Camera, Photo Library, Browse Files)
- **With `capture="environment"`**: Opens camera directly without giving options

## Reference Implementation

The working pattern from Nuevo Producto in `productos/page.js`:

```jsx
// Image dropzone with proper mobile support
<label className={styles.dropzone}>
  <input
    type="file"
    accept="image/*"
    onChange={handleImageChange}
    className={styles.fileInput}
  />
  <span>📸 Agregar foto</span>
  <p>Arrastra o haz clic para seleccionar</p>
</label>
```

## Files That Use This Pattern

Always verify these inputs follow the correct pattern:

- `productos/page.js` - Nuevo Producto form (photo)
- `productos/page.js` - Stock modal (comprobante adjunto)
- `proveedores/page.js` - Compra modal (comprobante adjunto)
- `gastos/page.js` - Nuevo gasto (comprobante)
- `clientes/page.js` - Any photo inputs
