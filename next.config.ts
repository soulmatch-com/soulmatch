import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
