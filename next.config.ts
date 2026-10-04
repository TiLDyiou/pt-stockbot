import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // vnstock-js runs server-side only
  serverExternalPackages: ["vnstock-js"],
};

export default nextConfig;
