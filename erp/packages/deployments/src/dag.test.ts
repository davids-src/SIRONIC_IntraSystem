/**
 * Module DAG guard (PROJECT_PLAN §4, docs/17 §3 #8): `@erp/integrations` is a leaf that only
 * `@erp/deployments` (the one allowed edge) and the composition root may depend on; the domain
 * package must not reach into other domain modules or engine services.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGES = join(__dirname, "../..");
const pkg = (dir: string) =>
  JSON.parse(readFileSync(join(PACKAGES, dir, "package.json"), "utf8")) as {
    name: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
const deps = (p: ReturnType<typeof pkg>) => [
  ...Object.keys(p.dependencies ?? {}),
  ...Object.keys(p.devDependencies ?? {}),
];

describe("module DAG", () => {
  const dirs = readdirSync(PACKAGES).filter(
    (d) =>
      statSync(join(PACKAGES, d, "package.json"), { throwIfNoEntry: false }) !==
      undefined,
  );

  it("only @erp/deployments depends on @erp/integrations", () => {
    const users = dirs
      .filter((d) => deps(pkg(d)).includes("@erp/integrations"))
      .map((d) => pkg(d).name);
    expect(users).toEqual(["@erp/deployments"]);
  });

  it("@erp/integrations is framework-free: no workspace dependency at all", () => {
    expect(
      deps(pkg("integrations")).filter(
        (d) =>
          d.startsWith("@erp/") &&
          !d.includes("eslint-config") &&
          !d.includes("tsconfig"),
      ),
    ).toEqual([]);
  });

  it("@erp/deployments depends on no other domain module or engine service", () => {
    const erp = deps(pkg("deployments")).filter((d) => d.startsWith("@erp/"));
    const engine = [
      "@erp/core",
      "@erp/db-core",
      "@erp/lib",
      "@erp/rbac",
      "@erp/ui",
      "@erp/integrations",
      "@erp/eslint-config",
      "@erp/tsconfig",
      "@erp/test-utils",
    ];
    expect(erp.filter((d) => !engine.includes(d))).toEqual([]);
  });

  it("only kliensek.ts, orchestrator.ts and the step handlers import @erp/integrations at runtime", () => {
    const src = join(__dirname);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) files.push(p);
      }
    };
    walk(src);
    const runtime = files.filter((f) =>
      /^\s*import\s+(?!type)[^;]*from "@erp\/integrations"/m.test(
        readFileSync(f, "utf8"),
      ),
    );
    const rel = runtime.map((f) => f.slice(src.length + 1)).sort();
    expect(rel).toEqual([
      "kliensek.ts",
      "lepesek/cloudflare.ts",
      "lepesek/npm.ts",
      "orchestrator.ts",
      "shared.ts",
    ]);
  });
});
