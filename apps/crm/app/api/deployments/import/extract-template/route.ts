import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";

const bodySchema = z.object({
  portainer_stack_id: z.number(),
  domain: z.string().optional(),
  stack_name: z.string().optional(),
});

const SECRET_HINTS = /SECRET|PASSWORD|PASS|TOKEN|KEY|PRIVATE/i;

type Placeholder = {
  key: string;
  label: string;
  required: boolean;
  default_value: string | null;
  secret: boolean;
};

/**
 * Turns a live stack's actual compose file into a reusable template: env var *values* and
 * the literal image/stack-name/domain become `{{PLACEHOLDER}}` tokens (the same convention
 * `renderStack()` in stack-create.ts already substitutes at deploy time), while structure —
 * networks, volumes, service shape — is left as-is since that's what's actually reusable
 * across partner stacks.
 */
function genericizeComposeYaml(
  yaml: string,
  opts: { domain?: string; stackName?: string },
): { compose_yaml: string; placeholders: Placeholder[] } {
  let out = yaml;
  const keys = new Set<string>();

  // environment list form: "  - KEY=value"
  out = out.replace(
    /^(\s*-\s*)([A-Z][A-Z0-9_]*)=(.*)$/gm,
    (_match, prefix: string, key: string) => {
      keys.add(key);
      return `${prefix}${key}={{${key}}}`;
    },
  );

  // environment map form: "  KEY: value" — only inside an actual `environment:` block,
  // tracked by indentation, so unrelated upper-snake config (labels, deploy limits, ...)
  // outside that block doesn't get turned into a required placeholder.
  const mapFormLine = /^(\s{2,})([A-Z][A-Z0-9_]*):\s+(?!\{\{)(.+)$/;
  const environmentHeader = /^(\s*)environment:\s*$/;
  let envBlockIndent: number | null = null;
  out = out
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return line;
      const header = environmentHeader.exec(line);
      if (header) {
        envBlockIndent = (header[1] as string).length;
        return line;
      }
      const indent = /^(\s*)/.exec(line)?.[1]?.length ?? 0;
      if (envBlockIndent !== null && indent <= envBlockIndent) {
        envBlockIndent = null;
      }
      if (envBlockIndent === null) return line;
      const mapMatch = mapFormLine.exec(line);
      if (!mapMatch) return line;
      const [, lineIndent, key] = mapMatch;
      keys.add(key as string);
      return `${lineIndent}${key}: "{{${key}}}"`;
    })
    .join("\n");

  // image: repo:tag -> {{IMAGE}}:{{IMAGE_TAG}}
  out = out.replace(/^(\s*image:\s*)(?!\{\{)(\S+)\s*$/gm, (_match, prefix: string) => {
    return `${prefix}{{IMAGE}}:{{IMAGE_TAG}}\n`;
  });

  if (opts.stackName) {
    out = out.split(opts.stackName).join("{{STACK_NAME}}");
  }
  if (opts.domain) {
    out = out.split(opts.domain).join("{{DOMAIN}}");
  }

  const placeholders: Placeholder[] = [...keys].map((key) => ({
    key,
    label: key,
    required: true,
    default_value: null,
    secret: SECRET_HINTS.test(key),
  }));

  return { compose_yaml: out, placeholders };
}

/** Lists Portainer stacks so the settings UI can offer a picker instead of a raw numeric id. */
export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "view", scope: "global" });
    return await withDb(async () => {
      const { clients } = await buildStepClientsForTenant(actor.tenantId);
      if (!clients.portainer) {
        return NextResponse.json({ stacks: [] });
      }
      const stacks = await clients.portainer.listStacks();
      return NextResponse.json({
        stacks: stacks.map((s) => ({ id: s.Id, name: s.Name })),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const { clients } = await buildStepClientsForTenant(actor.tenantId);
      if (!clients.portainer) {
        return NextResponse.json(
          { error: "Nincs aktív Portainer integráció." },
          { status: 409 },
        );
      }
      const raw = await clients.portainer.getStackFile(parsed.data.portainer_stack_id);
      if (!raw) {
        return NextResponse.json(
          { error: "A stack fájl nem elérhető vagy üres." },
          { status: 404 },
        );
      }
      const result = genericizeComposeYaml(raw, {
        domain: parsed.data.domain,
        stackName: parsed.data.stack_name,
      });
      return NextResponse.json(result);
    });
  } catch (e) {
    return handleApiError(e);
  }
}
