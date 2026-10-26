import { NextResponse } from "next/server";
import { SettingsModel } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB max upload limit
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "admin", scope: "global" });

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Hiányzó vagy érvénytelen fájl." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "A feltöltött fájl üres." }, { status: 400 });
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: `A fájl túl nagy (maximum ${MAX_LOGO_BYTES / 1024 / 1024} MB lehet).` },
        { status: 400 },
      );
    }

    const mimeType = file.type || "image/png";
    if (!ALLOWED_MIME_TYPES.includes(mimeType) && !mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Csak képfájlok (PNG, JPG, SVG, WebP) tölthetők fel." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return await withDb(async () => {
      await SettingsModel.findOneAndUpdate(
        { tenantId: actor.tenantId },
        { $set: { "company_details.logo_url": dataUrl } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return NextResponse.json({
        success: true,
        logo_url: dataUrl,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "admin", scope: "global" });

    return await withDb(async () => {
      await SettingsModel.findOneAndUpdate(
        { tenantId: actor.tenantId },
        { $set: { "company_details.logo_url": null } },
        { upsert: true },
      );

      return NextResponse.json({ success: true, logo_url: null });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
