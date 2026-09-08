import { NextResponse } from "next/server";
import { z } from "zod";
import { IntegrationConnectionModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { encryptSecret } from "@/lib/secret-crypto";

const createSchema = z.object({
  provider: z.enum(["cloudflare", "npm", "portainer", "github"]),
  label: z.string().min(1),
  base_url: z.string().url(),
  credentials: z.record(z.string(), z.string()),
  meta: z.record(z.string(), z.unknown()).optional(),
});

function omitSecrets(doc: Record<string, unknown>) {
  const { encrypted_credentials, ...rest } = doc;
  void encrypted_credentials;
  return { ...rest, has_credentials: true };
}

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await IntegrationConnectionModel.find({ tenantId: actor.tenantId })
        .sort({ provider: 1, label: 1 })
        .lean();
      return NextResponse.json(
        serializeForJson(rows.map((r) => omitSecrets(r as Record<string, unknown>))),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "admin", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await IntegrationConnectionModel.create({
        tenantId: actor.tenantId,
        provider: b.provider,
        label: b.label,
        base_url: b.base_url,
        encrypted_credentials: encryptSecret(JSON.stringify(b.credentials)),
        meta: b.meta ?? {},
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(omitSecrets(doc.toObject())), {
        status: 201,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
