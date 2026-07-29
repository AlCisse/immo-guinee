// PWA disabled - next-pwa v5 is incompatible with App Router / Next.js 15
// import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone mode for Docker

  // Type/lint errors BLOCK the build by default — including production, so a
  // prod build can never silently ship broken types (~50 legacy errors remain:
  // `npx tsc --noEmit` / `npm run lint`). If a deploy must be unblocked while
  // those are being resolved, set the escape-hatch env explicitly and knowingly:
  //   ALLOW_BUILD_ERRORS=true npm run build
  typescript: {
    ignoreBuildErrors: process.env.ALLOW_BUILD_ERRORS === 'true',
  },
  eslint: {
    ignoreDuringBuilds: process.env.ALLOW_BUILD_ERRORS === 'true',
  },

  // Image optimization. remotePatterns is an allow-list — keep it exact (no
  // wildcards) so the Next image optimizer can't be pointed at arbitrary hosts.
  images: {
    remotePatterns: [
      // Production CDN + owned domains (always allowed).
      { protocol: 'https', hostname: 'immoguinee.com' },
      { protocol: 'https', hostname: 'www.immoguinee.com' },
      { protocol: 'https', hostname: 'images.immoguinee.com' },
      { protocol: 'https', hostname: 'immoguinee.gn' },
      { protocol: 'https', hostname: 'www.immoguinee.gn' },
      { protocol: 'https', hostname: 'storage.immoguinee.gn' },
      // DigitalOcean Spaces — exact buckets only (no `*.digitaloceanspaces.com`).
      { protocol: 'https', hostname: 'immoguinee.fra1.digitaloceanspaces.com' },
      { protocol: 'https', hostname: 'immoguinee-images.fra1.digitaloceanspaces.com' },
      // Dev-only hosts (MinIO / localhost) — excluded from production builds.
      ...(process.env.NODE_ENV !== 'production'
        ? [
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'http', hostname: 'minio' },
            { protocol: 'https', hostname: 'minio' },
            { protocol: 'https', hostname: 'via.placeholder.com' },
          ]
        : []),
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Environment variables exposed to the browser
  env: {
    // Use env variable (dev: http://localhost:8000/api, prod: /api via proxy)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
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
          // X-XSS-Protection intentionally omitted: the legacy header is
          // deprecated and can itself introduce vulnerabilities on old browsers.
          // The Content-Security-Policy (see middleware.ts) is the modern defense.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Same-origin API proxy for the container/dev stack: the browser calls
  // /api/* on this origin and Next forwards it to the backend server-side. This
  // avoids CORS and works even when the browser cannot reach the backend port
  // directly. Local Next routes (e.g. /api/health) win — rewrites run afterFiles.
  // In production Traefik routes /api instead (BACKEND_INTERNAL_URL unset -> no-op).
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL;
    const media = process.env.MEDIA_INTERNAL_URL; // MinIO (S3) internal endpoint
    const rules = [];
    if (backend) rules.push({ source: '/api/:path*', destination: `${backend}/api/:path*` });
    // Same-origin proxy for listing photos so the browser and the Next Image
    // optimizer both reach MinIO through this origin (dev; prod uses a CDN).
    if (media) rules.push({ source: '/media/:path*', destination: `${media}/:path*` });
    return rules;
  },

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
