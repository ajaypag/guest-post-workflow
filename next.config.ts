import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.linkio.com',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Fix for OpenAI Agents SDK missing Model Context Protocol dependency
      config.resolve.alias['@modelcontextprotocol/sdk/types.js'] = false;
    }
    return config;
  },
};

export default nextConfig;
