import { NextResponse } from "next/server";
import { getCurrentUser } from "@erp/auth";
import {
  getVedettMediaResolver,
  isAllowedUploadContentType,
  officeContentType,
  MEDIA_UPLOAD_MAX_BYTES,
  uploadFileToMedia,
} from "@erp/media";
import { regisztralVedettMedia } from "@/lib/vedett-media";

/**
 * Upload of a protected (`vedett`) file — ARCHITECTURE §7.5. Not gated on `media:upload`: the
 * resolver of the target entity type decides (e.g. anyone giving a task, or whoever may comment
 * on that task). The file is not attached yet — the entity's own Server Action does that with
 * `syncMediaUsage`, and accepts only files this user uploaded (`filterCsatolhatoVedettMedia`).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  regisztralVedettMedia();

  const formData = await request.formData();
  const entityType = formData.get("entityType");
  const rawEntityId = formData.get("entityId");
  const entityId = typeof rawEntityId === "string" && rawEntityId ? rawEntityId : null;
  const resolver =
    typeof entityType === "string" ? getVedettMediaResolver(entityType) : undefined;
  if (!resolver) return NextResponse.json({ error: "Ismeretlen cél" }, { status: 400 });
  const viewer = { userId: user.id, permissions: user.permissions };
  if (!(await resolver.canUpload(viewer, entityId))) {
    return NextResponse.json({ error: "Ehhez nem tölthetsz fel fájlt" }, { status: 403 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Válassz ki egy fájlt" }, { status: 400 });
  }
  if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: `${file.name}: legfeljebb 20 MB` },
      { status: 413 },
    );
  }
  // Office files: the type browsers send varies (often empty) — store the one of the extension.
  const contentType =
    officeContentType(file.name) ?? (file.type || "application/octet-stream");
  if (!isAllowedUploadContentType(contentType, file.name, { documents: true })) {
    return NextResponse.json(
      { error: `${file.name}: csak kép, PDF, Word vagy Excel` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFileToMedia(buffer, {
    filename: file.name,
    contentType,
    hozzaferes: "vedett",
    feltoltoId: user.id,
  });
  return NextResponse.json({ id: result.id, filename: file.name, contentType });
}
