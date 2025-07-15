import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xomspbzacozvxuoftetb.supabase.co',
      },
    ],
  },
};

export default nextConfig;
