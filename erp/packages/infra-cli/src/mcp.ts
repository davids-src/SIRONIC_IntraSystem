/**
 * MCP server (stdio, newline-delimited JSON-RPC 2.0) exposing the same tools as the CLI.
 *
 * Register in an agent client, e.g. Claude Code (`.mcp.json`):
 *   { "mcpServers": { "sironic-infra": { "command": "pnpm", "args": ["--dir", "<repo>/erp", "--filter", "@erp/infra-cli", "mcp"] } } }
 * Dependency-free on purpose: initialize / tools/list / tools/call / ping are all this needs.
 */
import "./env-init";
import { createInterface } from "node:readline";
import { kotelezoEnv } from "./env";
import { TOOLS, futtat, jsonSchema } from "./tools";

export type RpcKeres = {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
};
type RpcValasz = {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
};

const VERZIO = "0.1.0";
const TAMOGATOTT = ["2025-06-18", "2025-03-26", "2024-11-05"];
let ugyfel = "agent";

export async function kezel(k: RpcKeres): Promise<RpcValasz | null> {
  const id = k.id ?? null;
  const ok = (result: unknown): RpcValasz => ({ jsonrpc: "2.0", id, result });
  const hiba = (code: number, message: string): RpcValasz => ({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
  if (k.id === undefined) return null; // notification (e.g. notifications/initialized)
  switch (k.method) {
    case "initialize": {
      const kert = String(
        (k.params as { protocolVersion?: string } | undefined)?.protocolVersion ?? "",
      );
      const ci = (k.params as { clientInfo?: { name?: string } } | undefined)?.clientInfo
        ?.name;
      if (ci) ugyfel = ci.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40) || "agent";
      return ok({
        protocolVersion: TAMOGATOTT.includes(kert) ? kert : TAMOGATOTT[0],
        capabilities: { tools: {} },
        serverInfo: { name: "sironic-infra", version: VERZIO },
        instructions:
          "SIRONIC infra: a stack is a Portainer stack (several images); a site is a hostname → one stack service with DNS (Cloudflare), SSL (Let's Encrypt DNS-01) and an NPM proxy host. Start with `overview`. Secrets in compose/env are masked unless reveal=true.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: jsonSchema(t),
          annotations: {
            readOnlyHint: t.readOnly === true,
            destructiveHint: t.destructive === true,
            idempotentHint: t.readOnly === true,
            openWorldHint: true,
          },
        })),
      });
    case "tools/call": {
      const p = (k.params ?? {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      if (!p.name || !TOOLS.some((t) => t.name === p.name))
        return hiba(-32602, `Ismeretlen eszköz: ${p.name}`);
      try {
        const r = await futtat(p.name, p.arguments ?? {}, { szereplo: `mcp:${ugyfel}` });
        return ok({ content: [{ type: "text", text: JSON.stringify(r, null, 2) }] });
      } catch (err) {
        return ok({
          isError: true,
          content: [
            { type: "text", text: err instanceof Error ? err.message : String(err) },
          ],
        });
      }
    }
    default:
      return hiba(-32601, `Nem támogatott metódus: ${k.method}`);
  }
}

async function main(): Promise<void> {
  kotelezoEnv();
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (sor) => {
    if (!sor.trim()) return;
    let k: RpcKeres;
    try {
      k = JSON.parse(sor) as RpcKeres;
    } catch {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`,
      );
      return;
    }
    void kezel(k).then((v) => v && process.stdout.write(`${JSON.stringify(v)}\n`));
  });
  rl.on("close", () => process.exit(0));
}

if (process.argv[1] && /mcp\.(ts|js)$/.test(process.argv[1])) {
  main().catch((err: unknown) => {
    console.error(
      `sironic-infra-mcp: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
}
