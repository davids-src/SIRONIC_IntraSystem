import { NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@erp/auth";
import {
  deleteMediaById,
  getNyilvanosMediaById,
  mediaPreviewPath,
  MEDIA_READ_PERMISSION_KEYS,
} from "@erp/media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAnyPermission([...MEDIA_READ_PERMISSION_KEYS]);
  const { id } = await params;
  // Protected files are not part of the Médiatár (§7.5).
  const media = await getNyilvanosMediaById(id);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: String(media._id),
    type: media.type,
    filename: media.filename,
    url: media.url,
    contentType: media.contentType,
    size: media.size,
    useCount: media.useCount,
    usages: media.usages,
    previewUrl: mediaPreviewPath(String(media._id)),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("media:delete");
  const { id } = await params;
  // A protected file belongs to its entity, not to the Médiatár — it cannot be deleted here.
  if (!(await getNyilvanosMediaById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await deleteMediaById(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message ?? "Delete failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
