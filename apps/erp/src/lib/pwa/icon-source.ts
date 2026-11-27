import { ObjectId } from "mongodb";
import { connectDB, getBranding, getUploadsBucket, Media } from "@erp/db-core";

/** Formats the ImageResponse renderer (satori) can draw. */
const RENDERABLE = /^image\/(png|jpe?g|gif|svg\+xml)$/;

/**
 * The custom PWA icon chosen under Admin > Arculat, as something `<img src>` in an ImageResponse
 * can draw: a data URI for an uploaded file, the URL for a linked image. `undefined` (→ the
 * built-in mark) when none is set, it is protected (`vedett`), unrenderable or unreadable.
 */
export async function getCustomPwaIconSrc(): Promise<string | undefined> {
  try {
    const { pwaIconId } = await getBranding();
    if (!pwaIconId || !ObjectId.isValid(pwaIconId)) return undefined;
    await connectDB();
    const media = await Media.findById(pwaIconId).lean().exec();
    if (!media || media.hozzaferes === "vedett") return undefined;
    if (media.type === "link" && media.url) return media.url;
    const contentType = media.contentType ?? "";
    if (media.type !== "file" || !media.gridFsId || !RENDERABLE.test(contentType)) {
      return undefined;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of getUploadsBucket().openDownloadStream(
      new ObjectId(media.gridFsId),
    )) {
      chunks.push(Buffer.from(chunk));
    }
    return `data:${contentType};base64,${Buffer.concat(chunks).toString("base64")}`;
  } catch {
    return undefined;
  }
}
