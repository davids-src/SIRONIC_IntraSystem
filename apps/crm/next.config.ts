import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@crm/ui",
    "@crm/types",
    "@crm/rbac",
    "@crm/modules",
    "@crm/auth",
    "@crm/db",
  ],
  serverExternalPackages: ["mongoose", "mongodb"],
};

export default nextConfig;
