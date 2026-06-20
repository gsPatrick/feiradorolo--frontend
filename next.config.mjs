/** @type {import('next').NextConfig} */
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
