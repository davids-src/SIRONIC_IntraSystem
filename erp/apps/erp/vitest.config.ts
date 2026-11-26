import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/** GitHub Actions sets CI=true: memory Mongo runs in the dedicated test:integration step. */
const isCi = Boolean(process.env.CI);

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // next-auth's ESM build imports "next/server" without extension; let vite resolve it.
    server: { deps: { inline: ["next-auth"] } },
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
    exclude: isCi
      ? ["**/node_modules/**", "**/*.integration.test.ts"]
      : ["**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
