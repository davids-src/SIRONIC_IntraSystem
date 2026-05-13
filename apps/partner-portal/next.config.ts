import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
// Shared `.env*` at monorepo root; `apps/partner-portal/.env*` overrides when present.
loadEnvConfig(repoRoot);
loadEnvConfig(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crm/ui"],
};

export default nextConfig;
