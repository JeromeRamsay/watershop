import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/kiosk/refill",
        destination: "/refill",
        permanent: true,
      },
      {
        source: "/kiosk/refill/name",
        destination: "/refill/name",
        permanent: true,
      },
      {
        source: "/kiosk/refill/select",
        destination: "/refill/select",
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
