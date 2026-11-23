import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  async redirects() {
    return [
      {
        source: '/sulam/:path*',
        destination: 'http://localhost:3001/sulam/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
