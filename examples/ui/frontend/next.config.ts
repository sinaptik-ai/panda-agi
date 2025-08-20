import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // // Handle redirects at the frontend level first
  // async redirects() {
  //   return [
  //     {
  //       source: '/creations/:artifact_id',
  //       destination: '/creations/:artifact_id/index.html',
  //       permanent: false,
  //     },
  //   ];
  // },
  
  // Proxy configuration for public artifacts
  async rewrites() {
    return [
      {
        source: '/creations/share/:artifact_id/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/artifacts/public/:artifact_id/:path*`,
      },
      {
        source: '/creations/private/:artifact_id/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/artifacts/:artifact_id/:path*`,
      }
    ];
  },
};

export default nextConfig;
