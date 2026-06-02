import { NextResponse } from "next/server";
import { SecretModel } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { decryptSecret } from "@/lib/secret-crypto";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST /api/secrets/[id]/reveal
 * Visszafejti a titkos értéket és visszaadja a plaintext-et.
 * Kizárólag szerveroldalon — soha nem tárolódik, csak a válaszban szerepel.
 */
export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    // Csak "view"-nél magasabb jogosultság szükséges a visszafejtéshez
    guard(actor, { module: "secret", action: "write", scope: "global" });

    return await withDb(async () => {
      const doc = await SecretModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const plaintext = decryptSecret((doc as any).encrypted_value);

      return NextResponse.json({ value: plaintext });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
