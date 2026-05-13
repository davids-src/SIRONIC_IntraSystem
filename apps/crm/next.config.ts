import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
// Shared `.env*` at monorepo root; `apps/crm/.env*` overrides when present.
loadEnvConfig(repoRoot);
loadEnvConfig(__dirname);

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
