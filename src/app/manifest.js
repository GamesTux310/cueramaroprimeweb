export default function manifest() {
  return {
    name: 'Carnicería Cuerámaro Prime',
    short_name: 'Cuerámaro Prime',
    description: 'Sistema de gestión de ventas, inventario y finanzas para la Carnicería Cuerámaro Prime',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#dc2626',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}
