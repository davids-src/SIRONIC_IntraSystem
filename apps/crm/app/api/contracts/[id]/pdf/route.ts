import { NextResponse } from "next/server";
import { ContractModel } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_PDF_BYTES = 15 * 1024 * 1024; // Mongo document limit is 16MB
const PDF_MAGIC = "%PDF-";

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = (await ContractModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean()) as any;
      if (!doc || !doc.pdf_file?.data) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const buf = Buffer.isBuffer(doc.pdf_file.data)
        ? doc.pdf_file.data
        : Buffer.from(doc.pdf_file.data.buffer ?? doc.pdf_file.data);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": doc.pdf_file.content_type || "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.pdf_file.filename || "szerzodes.pdf")}"`,
          "Content-Length": String(buf.length),
          "Cache-Control": "private, no-store",
        },
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "write", scope: "global" });

    return await withDb(async () => {
      const existing = await ContractModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (existing.type !== "uploaded") {
        return NextResponse.json(
          { error: "Csak feltöltés típusú szerződéshez tölthető fel PDF." },
          { status: 400 },
        );
      }

      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Hiányzó fájl." }, { status: 400 });
      }
      if (file.size === 0) {
        return NextResponse.json({ error: "Üres fájl." }, { status: 400 });
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: `A fájl túl nagy (max ${MAX_PDF_BYTES / 1024 / 1024}MB).` },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      const looksLikePdf =
        buf.subarray(0, PDF_MAGIC.length).toString("latin1") === PDF_MAGIC;
      if (!looksLikePdf) {
        return NextResponse.json(
          { error: "A feltöltött fájl nem érvényes PDF." },
          { status: 400 },
        );
      }

      const safeFilename = (file.name || "szerzodes.pdf").replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );

      existing.pdf_file = {
        data: buf,
        content_type: "application/pdf",
        filename: safeFilename,
        size: buf.length,
      } as any;
      existing.pdf_url = `/api/contracts/${id}/pdf`;
      await existing.save();

      return NextResponse.json({ ok: true, pdf_url: existing.pdf_url });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
