/**
 * `sironic-infra` — operate the SIRONIC infra (stacks, sites, SSL) from a terminal or a script.
 *
 *   sironic-infra overview
 *   sironic-infra stack list
 *   sironic-infra stack pull sakkmed
 *   sironic-infra site create --hosts new.example.hu,www.new.example.hu --stack sakkmed --service sakk_web --port 3000
 *
 * Every command is a tool of the shared registry (`tools.ts`), exactly what the MCP server exposes.
 */
import "./env-init";
import { readFileSync } from "node:fs";
import { userInfo } from "node:os";
import { kotelezoEnv } from "./env";
import { FORMATUMOK } from "./formatum";
import { TOOLS, futtat, toolKeres, type Args, type Tool } from "./tools";

function segitseg(): string {
  const csoportok = new Map<string, Tool[]>();
  for (const t of TOOLS) {
    const [g] = t.name.split("_");
    csoportok.set(t.name.includes("_") ? g! : "(általános)", [
      ...(csoportok.get(t.name.includes("_") ? g! : "(általános)") ?? []),
      t,
    ]);
  }
  const sorok = ["sironic-infra <csoport> <művelet> [azonosító] [--kapcsoló érték]", ""];
  for (const [g, tt] of csoportok) {
    sorok.push(`${g}:`);
    for (const t of tt) {
      const parancs = t.name.replace("_", " ").replace(/_/g, "-");
      const poz = Object.entries(t.params).find(([, p]) => p.positional)?.[0];
      const kapcsolok = Object.entries(t.params)
        .filter(([k]) => k !== poz)
        .map(
          ([k, p]) =>
            `${p.required ? "" : "["}--${k.replace(/_/g, "-")}${p.required ? "" : "]"}`,
        )
        .join(" ");
      sorok.push(`  ${parancs}${poz ? ` <${poz}>` : ""} ${kapcsolok}`.trimEnd());
      sorok.push(`      ${t.description.split(". ")[0]}.`);
    }
    sorok.push("");
  }
  sorok.push(
    "Általános kapcsolók:  --json (nyers JSON)  --env-file <út>  --compose-file <út> (stack update/create)",
    "Környezet: MONGODB_URI, MONGODB_DB_NAME, SECRETS_ENCRYPTION_KEY (alapértelmezés: erp/apps/erp/.env).",
  );
  return sorok.join("\n");
}

/** `stack pull sakkmed --pull` → { tool, args }. Command words are matched longest-first. */
export function parancsElemez(argv: string[]): {
  tool: Tool;
  args: Args;
  json: boolean;
  envFile?: string;
} {
  const szavak: string[] = [];
  const kapcsolok: Args = {};
  let json = false;
  let envFile: string | undefined;
  let composeFile: string | undefined;
  const marad: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const [kulcsNyers, egyenlo] = a.slice(2).split(/=(.*)/s, 2) as [
        string,
        string | undefined,
      ];
      const kulcs = kulcsNyers.replace(/-/g, "_");
      let ertek: string | boolean | undefined = egyenlo;
      if (ertek === undefined) {
        const kov = argv[i + 1];
        if (kov !== undefined && !kov.startsWith("--")) {
          ertek = kov;
          i += 1;
        } else ertek = true;
      }
      if (kulcs === "json") json = true;
      else if (kulcs === "env_file") envFile = String(ertek);
      else if (kulcs === "compose_file") composeFile = String(ertek);
      else if (kulcs in kapcsolok) {
        const regi = kapcsolok[kulcs];
        kapcsolok[kulcs] = [...(Array.isArray(regi) ? regi : [regi]), ertek];
      } else kapcsolok[kulcs] = ertek;
    } else szavak.push(a);
  }
  // longest command prefix: "site ssl renew" before "site ssl"
  let tool: Tool | undefined;
  let hasznalt = 0;
  for (let n = Math.min(3, szavak.length); n >= 1 && !tool; n -= 1) {
    tool = toolKeres(szavak.slice(0, n).join("_").replace(/-/g, "_"));
    if (tool) hasznalt = n;
  }
  if (!tool)
    throw new Error(
      `Ismeretlen parancs: ${szavak.join(" ") || "(üres)"}. Súgó: sironic-infra help`,
    );
  marad.push(...szavak.slice(hasznalt));
  const poz = Object.entries(tool.params).find(([, p]) => p.positional)?.[0];
  if (poz && marad[0] !== undefined) kapcsolok[poz] = marad.shift();
  if (marad.length) throw new Error(`Felesleges argumentum: ${marad.join(" ")}`);
  if (composeFile) kapcsolok.compose = readFileSync(composeFile, "utf8");
  // a lone `--env` list entry stays a list; a bare boolean flag stays `true`
  return { tool, args: kapcsolok, json, envFile };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || ["help", "--help", "-h"].includes(argv[0]!)) {
    console.log(segitseg());
    return;
  }
  const { tool, args, json } = parancsElemez(argv);
  kotelezoEnv();
  const eredmeny = await futtat(tool.name, args, {
    szereplo: `cli:${userInfo().username}`,
  });
  const fmt = FORMATUMOK[tool.name];
  console.log(!json && fmt ? fmt(eredmeny as never) : JSON.stringify(eredmeny, null, 2));
}

if (process.argv[1] && /cli\.(ts|js)$/.test(process.argv[1])) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error(`Hiba: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    });
}
