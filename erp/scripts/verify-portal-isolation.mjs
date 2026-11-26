#!/usr/bin/env node
/**
 * Portal isolation guard (CI-style). Fails when code under `apps/portal/src` could reach another
 * partner's data or bypass the structural viewer filter:
 *
 *   1. imports a Mongoose model / driver (`mongoose`, `mongodb`, any `models` path,
 *      deep `@erp/<pkg>/src` paths,
 *      capitalized value imports from `@erp/db-core`),
 *   2. imports the staff auth stack (`@erp/auth`, `next-auth`, `@erp/rbac`),
 *   3. calls a domain facade method (`xxxApi.method(...)`) without a `nezo` argument
 *      (methods ending in `Tokennel` are bound to a one-time token instead),
 *   4. uses a facade object without calling a method on it (aliasing / destructuring),
 *   5. builds a portal viewer literal (`kind: "portal"`) anywhere except `lib/nezo.ts`
 *      (the viewer comes from the signed session only).
 *
 * Test files (`*.test.ts(x)`) are not scanned. Usage: `node scripts/verify-portal-isolation.mjs`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORTAL_SRC = path.join(here, "..", "apps", "portal", "src");

/** Workspace packages that are not domain facades. */
const NON_DOMAIN = new Set(["ui", "lib", "mail", "media", "portal-auth", "db-core", "core"]);
const FORBIDDEN_IMPORT = [
  [/^mongoose$|^mongodb$/, "imports a database driver"],
  [/(^|\/)models(\/|$)/, "imports a model"],
  [/^@erp\/[^/]+\/src(\/|$)/, "deep-imports package internals"],
  [/^@erp\/auth(\/|$)|^next-auth(\/|$)|^@erp\/rbac(\/|$)/, "imports the staff auth stack"],
];

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Text of the balanced `( ... )` starting at `open` (index of "("), or "" if unbalanced. */
function balanced(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return text.slice(open + 1, i);
  }
  return "";
}

/** Returns a list of `{line, message}` violations for one source file. */
export function scanSource(file, text) {
  const out = [];
  const rel = file.replace(/\\/g, "/");
  const add = (index, message) => out.push({ file: rel, line: lineOf(text, index), message });

  const facades = new Set();
  const importRe = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  for (const m of text.matchAll(importRe)) {
    const [, typeOnly, clause, spec] = m;
    for (const [re, why] of FORBIDDEN_IMPORT) if (re.test(spec)) add(m.index, `${why}: "${spec}"`);
    if (spec === "@erp/db-core" && !typeOnly) {
      const names = clause
        .replace(/[{}]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("type "));
      for (const n of names) {
        const local = n.split(/\s+as\s+/)[0];
        if (/^[A-Z]/.test(local)) add(m.index, `imports model "${local}" from @erp/db-core`);
      }
    }
    const pkg = /^@erp\/([^/]+)/.exec(spec)?.[1];
    if (pkg && !NON_DOMAIN.has(pkg) && !typeOnly) {
      for (const n of clause.replace(/[{}]/g, "").split(",")) {
        const local = n.trim().split(/\s+as\s+/).pop()?.trim();
        if (local && /Api$/.test(local)) facades.add(local);
      }
    }
  }

  for (const f of facades) {
    // 3. every call carries the viewer
    const callRe = new RegExp(`\\b${f}\\.(\\w+)\\s*\\(`, "g");
    for (const m of text.matchAll(callRe)) {
      const method = m[1];
      if (/Tokennel$/.test(method)) continue;
      const open = m.index + m[0].length - 1;
      const args = balanced(text, open);
      if (!/\bnezo\b/.test(args))
        add(m.index, `${f}.${method}(...) is called without a \`nezo\` argument`);
    }
    // 4. no aliasing / destructuring of the facade object
    const useRe = new RegExp(`\\b${f}\\b(?!\\.\\w+\\s*\\()`, "g");
    for (const m of text.matchAll(useRe)) {
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      const line = text.slice(lineStart, text.indexOf("\n", m.index));
      if (/^\s*import\b|^\s*}\s*from\b|^\s*(type\s+)?\w+,?\s*$/.test(line)) continue;
      if (/^\s*(\/\/|\*)/.test(line)) continue;
      add(m.index, `${f} is used without a direct method call (aliasing is not allowed)`);
    }
  }

  // 5. the viewer is built in lib/nezo.ts only
  if (!/(^|\/)lib\/nezo\.ts$/.test(rel)) {
    for (const m of text.matchAll(/kind\s*:\s*["']portal["']/g))
      add(m.index, 'builds a portal viewer literal (kind: "portal") outside lib/nezo.ts');
  }
  return out;
}

function walk(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name))
      files.push(p);
  }
  return files;
}

export function scanPortal(root = PORTAL_SRC) {
  const violations = [];
  for (const f of walk(root))
    violations.push(...scanSource(path.relative(path.join(root, "..", "..", ".."), f), fs.readFileSync(f, "utf8")));
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!fs.existsSync(PORTAL_SRC)) {
    console.error("verify-portal-isolation: apps/portal/src not found");
    process.exit(1);
  }
  const v = scanPortal();
  if (v.length > 0) {
    console.error("Portal isolation violations:");
    for (const x of v) console.error(`  ${x.file}:${x.line}  ${x.message}`);
    process.exit(1);
  }
  console.log(`verify-portal-isolation: OK (${walk(PORTAL_SRC).length} files scanned)`);
}
