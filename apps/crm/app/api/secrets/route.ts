import { NextResponse } from "next/server";
import { SecretModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { encryptSecret } from "@/lib/secret-crypto";

/**
 * GET /api/secrets
 * Titkok listázása – CSAK metadata, az encrypted_value NEM kerül ki.
 * Query params: project_id, contact_id
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");
    const contact_id = searchParams.get("contact_id");

    return await withDb(async () => {
      const query: Record<string, unknown> = { tenantId: actor.tenantId };
      if (project_id) query.project_id = project_id;
      if (contact_id) query.contact_id = contact_id;

      const rows = await SecretModel.find(query)
        .sort({ key: 1 })
        .lean()
        .select("-encrypted_value"); // SOHA nem adjuk vissza a titkosított értéket listában

      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/secrets
 * Új titok létrehozása. A value-t AES-256-GCM-el titkosítjuk.
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "write", scope: "global" });

    const body: Record<string, unknown> = await req.json();
    const key = (body.key as string | undefined)?.trim();
    const value = (body.value as string | undefined) ?? "";
    const project_id = (body.project_id as string | null | undefined) ?? null;
    const contact_id = (body.contact_id as string | null | undefined) ?? null;
    const visibility =
      (body.visibility as string | undefined) === "private" ? "private" : "shared";

    if (!key) {
      return NextResponse.json({ error: "A 'key' mező kötelező." }, { status: 400 });
    }
    if (!project_id && !contact_id) {
      return NextResponse.json(
        { error: "Legalább project_id vagy contact_id megadása kötelező." },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const encrypted_value = encryptSecret(value);
      const doc = await SecretModel.create({
        tenantId: actor.tenantId,
        project_id,
        contact_id,
        key,
        encrypted_value,
        visibility,
        created_by: actor.actorId,
      });

      // Visszaadjuk az objektumot encrypted_value NÉLKÜL
      const plain = doc.toObject() as Record<string, unknown>;
      delete plain.encrypted_value;
      return NextResponse.json(serializeForJson(plain), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
