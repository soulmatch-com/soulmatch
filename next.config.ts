import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
      ],
    }]
  },
  async redirects() {
    return [
      // Keep links to the former .in domain working while all public URLs use .com.
      { source: '/:path*', has: [{ type: 'host', value: 'mythirumanam.in' }], destination: 'https://mythirumanam.com/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'www.mythirumanam.in' }], destination: 'https://mythirumanam.com/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'www.mythirumanam.com' }], destination: 'https://mythirumanam.com/:path*', permanent: true },
      { source: '/celebrations', destination: '/', permanent: true },
      { source: '/celebrations/thirukadaiyur', destination: '/', permanent: true },
      { source: '/celebrations/thirukadaiyur/60th-marriage', destination: '/60th-marriage', permanent: true },
      { source: '/celebrations/thirukadaiyur/70th-marriage', destination: '/70th-marriage', permanent: true },
      { source: '/celebrations/thirukadaiyur/80th-marriage', destination: '/80th-marriage', permanent: true },
      { source: '/celebrations/thirukadaiyur/plan', destination: '/plan', permanent: true },
      { source: '/celebrations/60th-marriage', destination: '/60th-marriage', permanent: true },
      { source: '/celebrations/70th-marriage', destination: '/70th-marriage', permanent: true },
      { source: '/celebrations/80th-marriage', destination: '/80th-marriage', permanent: true },
      { source: '/celebrations/enquire', destination: '/plan', permanent: true },
    ]
  },
  typescript: {
    // Warning: Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-avatar', '@radix-ui/react-dialog'],
  },
};

export default nextConfig;
