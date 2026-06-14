import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // argon2 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["argon2"],
};

export default nextConfig;
