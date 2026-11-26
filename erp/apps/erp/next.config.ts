import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { ensurePublicUrlEnv } from "@erp/mail/env";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(appDir, "../..");

// Monorepo: load repo-root `.env` first, then `apps/erp/.env.local` overrides
loadEnvConfig(repoRoot);
loadEnvConfig(appDir);
ensurePublicUrlEnv();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  transpilePackages: [
    "@erp/admin",
    "@erp/arlista",
    "@erp/auth",
    "@erp/bizonylat",
    "@erp/core",
    "@erp/db-core",
    "@erp/infra",
    "@erp/ertekesites",
    "@erp/eszkoz",
    "@erp/feladat",
    "@erp/integrations",
    "@erp/jelzes",
    "@erp/keszlet",
    "@erp/lib",
    "@erp/mail",
    "@erp/media",
    "@erp/partner",
    "@erp/projekt",
    "@erp/rbac",
    "@erp/secrets",
    "@erp/szerviz",
    "@erp/ui",
  ],
  // pdfmake reads its bundled Roboto font files from disk at runtime (HR document PDFs).
  // exceljs: plain Node library, not bundled.
  serverExternalPackages: [
    "mongoose",
    "mongodb",
    "bcryptjs",
    "pdfmake",
    "web-push",
    "exceljs",
  ],
  // …which file tracing does not see (they are read via a computed path), so the standalone
  // output — the Docker image — would ship without them. Included explicitly.
  // generator-function / async-function (exceljs → unzipper → … → is-generator-function,
  // is-async-function) point their `module-sync` export at require.mjs, which Node ≥20.19 loads
  // but the tracer misses: without it every exceljs require — xlsx imports and exports — fails
  // in the image.
  outputFileTracingIncludes: {
    "/**/*": [
      "../../node_modules/.pnpm/pdfmake@*/node_modules/pdfmake/fonts/**/*",
      "../../node_modules/.pnpm/generator-function@*/node_modules/generator-function/*.mjs",
      "../../node_modules/.pnpm/async-function@*/node_modules/async-function/*.mjs",
    ],
  },
};

export default nextConfig;
