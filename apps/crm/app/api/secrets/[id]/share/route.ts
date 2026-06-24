import { NextResponse } from "next/server";
import { z } from "zod";
import { SecretShareModel, SecretModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import crypto from "crypto";

const createSchema = z.object({
  expires_hours: z.number().int().min(1).max(168).default(24), // max 7 nap
  view_count_limit: z.number().int().min(1).max(10).default(1),
});

/**
 * POST /api/secrets/[id]/share
 * Egyszer megosztható, lejáró link generálása egy titkos adathoz.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "write", scope: "global" });
    const { id } = await params;

    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      // Ellenőrizzük, hogy létezik-e a titkos adat és a tenant-hoz tartozik-e
      const secret = await SecretModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!secret) {
        return NextResponse.json({ error: "Titkos adat nem található" }, { status: 404 });
      }

      // Token generálás: 64 hex karakter = 32 byte
      const token = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + b.expires_hours);

      const share = await SecretShareModel.create({
        tenantId: actor.tenantId,
        secret_id: id,
        token,
        expires_at: expiresAt,
        view_count_limit: b.view_count_limit,
        view_count: 0,
        viewed_at: null,
        ip_address_log: [],
        created_by: actor.actorId,
      });

      // A megosztható link – a partner portál fogadja
      const baseUrl =
        process.env.NEXT_PUBLIC_PORTAL_URL ?? process.env.NEXTAUTH_URL ?? "";
      const shareUrl = `${baseUrl}/s/${token}`;

      return NextResponse.json(
        {
          share_id: share._id.toString(),
          token,
          share_url: shareUrl,
          expires_at: expiresAt.toISOString(),
          view_count_limit: b.view_count_limit,
        },
        { status: 201 },
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * GET /api/secrets/[id]/share
 * Az adott secret megosztási linkjeinek listázása.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "view", scope: "global" });
    const { id } = await params;

    return await withDb(async () => {
      const shares = await SecretShareModel.find({
        secret_id: id,
        tenantId: actor.tenantId,
      })
        .sort({ created_at: -1 })
        .lean();

      return NextResponse.json(serializeForJson(shares));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
