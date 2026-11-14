import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/kanal/terbaru", destination: "/kanal/news", permanent: true },
      { source: "/kontributor", destination: "/dashboard", permanent: true },
      { source: "/kontributor/:path*", destination: "/dashboard/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
