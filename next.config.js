/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable proper error checking for production readiness
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // TypeScript config - catch real errors
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Enable experimental features for better performance
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app'],
    },
    // Optimize compilation
    optimizePackageImports: ['uuid', 'zod'],
  },

  // External packages to exclude from server components bundling
  serverExternalPackages: ['munkres-js'],
  
  // Webpack optimization for circular dependencies
  webpack: (config, { isServer }) => {
    // Ignore circular dependency warnings that we're fixing
    config.ignoreWarnings = [
      { module: /teamManager/ },
      { module: /sessionManager/ },
    ];
    
    // Optimize compilation speed
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    
    return config;
  },

  // Environment variables available to the client
  env: {
    CUSTOM_KEY: 'value',
  },

  // Headers for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;