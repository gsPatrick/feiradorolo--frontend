/** @type {import('next').NextConfig} */
// cache-bust build: 2026-06-23-pneus (força rebuild limpo do builder no Docker)
const nextConfig = {
  reactStrictMode: true,
  // Build enxuto para Docker: gera .next/standalone com um server.js próprio.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
