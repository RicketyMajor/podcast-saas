import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Convex file storage (covers).
      { protocol: "https", hostname: "*.convex.cloud", pathname: "/api/storage/**" },
      // Google profile pictures (avatars).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
