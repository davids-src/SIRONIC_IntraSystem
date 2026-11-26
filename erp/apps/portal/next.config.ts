import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { ensurePublicUrlEnv } from "@erp/mail/env";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(appDir, "../..");

// Monorepo: load repo-root `.env` first, then `apps/portal/.env.local` overrides
loadEnvConfig(repoRoot);
loadEnvConfig(appDir);
ensurePublicUrlEnv();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  transpilePackages: [
    "@erp/bizonylat",
    "@erp/core",
    "@erp/db-core",
    "@erp/infra",
    "@erp/integrations",
    "@erp/lib",
    "@erp/mail",
    "@erp/media",
    "@erp/portal-auth",
    "@erp/projekt",
    "@erp/rbac",
    "@erp/szerviz",
    "@erp/ui",
  ],
  serverExternalPackages: ["mongoose", "mongodb", "bcryptjs", "exceljs"],
  // Magic links minted by @erp/bizonylat point at `/portal/igazolas/<token>`; the portal app
  // serves that page at `/igazolas/<token>`. A rewrite (not a redirect) keeps the token out of
  // an extra hop.
  async rewrites() {
    return [{ source: "/portal/igazolas/:token", destination: "/igazolas/:token" }];
  },
  async headers() {
    return [
      {
        // The one-time token page must never be cached or leak via the Referer header.
        source: "/igazolas/:token",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
