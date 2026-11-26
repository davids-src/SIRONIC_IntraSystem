import { defineConfig } from "vitest/config";
import path from "path";

/** GitHub Actions sets CI=true: memory Mongo runs in the dedicated test:integration step. */
const isCi = Boolean(process.env.CI);

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
    exclude: isCi
      ? ["**/node_modules/**", "**/*.integration.test.ts"]
      : ["**/node_modules/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
