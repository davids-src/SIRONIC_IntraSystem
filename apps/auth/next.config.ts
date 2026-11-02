import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
// Shared `.env*` at monorepo root; `apps/auth/.env*` overrides when present.
loadEnvConfig(repoRoot);
loadEnvConfig(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracing: false,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@crm/auth-core", "@crm/shared"],
  serverExternalPackages: ["mongoose", "mongodb"],
};

export default nextConfig;
