import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    // Excluir rutas de base de datos/API externas (Firebase) para no interferir con sync.js
    exclude: [
      /^\/api\/.*$/i,
      /^https:\/\/firestore\.googleapis\.com\/.*$/i,
      /^https:\/\/firebasestorage\.googleapis\.com\/.*$/i,
      /^https:\/\/identitytoolkit\.googleapis\.com\/.*$/i
    ]
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Allows custom webpack plugins to run or bypasses the strict check in Next 16
  }
};

export default withPWA(nextConfig);
