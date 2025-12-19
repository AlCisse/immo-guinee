// PWA disabled - next-pwa v5 is incompatible with App Router / Next.js 15
// import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone mode for Docker

  // Enable Turbopack (default in Next.js 16)
  turbopack: {},

  // Disable TypeScript errors during builds (fix issues separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'minio' },
      { protocol: 'https', hostname: 'minio' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      // Production domains
      { protocol: 'https', hostname: 'immoguinee.gn' },
      { protocol: 'https', hostname: 'www.immoguinee.gn' },
      { protocol: 'https', hostname: 'storage.immoguinee.gn' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Environment variables exposed to the browser
  env: {
    // Use relative path for browser-side API calls (same-origin)
    NEXT_PUBLIC_API_URL: '/api',
    NEXT_PUBLIC_ECHO_HOST: process.env.NEXT_PUBLIC_ECHO_HOST || 'localhost',
    NEXT_PUBLIC_ECHO_PORT: process.env.NEXT_PUBLIC_ECHO_PORT || '6001',
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Note: No rewrites needed - API calls go directly through Traefik

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for Leaflet in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// PWA configuration disabled - next-pwa v5 is incompatible with App Router / Next.js 15
// To re-enable PWA, use @ducanh2912/next-pwa instead

export default nextConfig;
