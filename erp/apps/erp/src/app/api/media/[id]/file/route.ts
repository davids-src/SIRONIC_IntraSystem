import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectDB, getUploadsBucket, Media } from "@erp/db-core";
import { getCurrentUser } from "@erp/auth";
import { canViewVedettMedia } from "@erp/media";
import { regisztralVedettMedia } from "@/lib/vedett-media";

async function streamGridFs(
  fileId: ObjectId,
  contentType: string,
  vedett?: { filename: string },
) {
  const bucket = getUploadsBucket();
  const stream = bucket.openDownloadStream(fileId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: vedett
      ? {
          "Content-Type": contentType,
          // Images / PDFs open in the browser; a Word or Excel file downloads.
          "Content-Disposition": `${
            /^(image\/|application\/pdf)/.test(contentType) ? "inline" : "attachment"
          }; filename*=UTF-8''${encodeURIComponent(vedett.filename)}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        }
      : {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
  });
}

/**
 * Public byte stream — no auth. Media ids aren't guessable/enumerable, and this also
 * has to serve branding assets (favicon, login background) on the unauthenticated
 * login page, so it can't be gated behind a session check.
 *
 * Except protected (`vedett`) files (ARCHITECTURE §7.5): those need a session and a yes from
 * the access resolver of one of their usages, and are never cached by a shared cache. "Not
 * allowed" is the same 404 as "not found", so an id reveals nothing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return new NextResponse(null, { status: 404 });
  }

  await connectDB();

  const media = await Media.findById(id).lean().exec();
  if (!media) {
    return new NextResponse(null, { status: 404 });
  }

  if (media.type === "link" && media.url) {
    return NextResponse.redirect(media.url, { status: 302 });
  }

  const vedett = media.hozzaferes === "vedett";
  if (vedett) {
    const user = await getCurrentUser();
    if (!user) return new NextResponse(null, { status: 401 });
    regisztralVedettMedia();
    const szabad = await canViewVedettMedia(media, {
      userId: user.id,
      permissions: user.permissions,
    });
    if (!szabad) return new NextResponse(null, { status: 404 });
  }

  if (media.type === "file" && media.gridFsId) {
    try {
      return await streamGridFs(
        new ObjectId(media.gridFsId),
        media.contentType ?? "application/octet-stream",
        vedett ? { filename: media.filename } : undefined,
      );
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  return new NextResponse(null, { status: 404 });
}
