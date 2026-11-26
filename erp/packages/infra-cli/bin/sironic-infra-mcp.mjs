#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const entry = fileURLToPath(new URL("../src/mcp.ts", import.meta.url));
const r = spawnSync(process.execPath, ["--import", "tsx", entry, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status ?? 1);
