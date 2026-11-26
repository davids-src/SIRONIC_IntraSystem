/** Client file input `accept` and server-side upload validation. */
export const MEDIA_UPLOAD_ACCEPT = "image/*,application/pdf";

/**
 * Editable office documents (Word, Excel, OpenDocument). Accepted only as protected (`vedett`)
 * attachments — contracts, tasks — never in the public Médiatár, and always served as a
 * download, not inline.
 */
export const OFFICE_DOCUMENT_TYPES: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
};

/** `accept` of attachment inputs that also take Word / Excel files. */
export const DOCUMENT_UPLOAD_ACCEPT = [
  MEDIA_UPLOAD_ACCEPT,
  ...Object.keys(OFFICE_DOCUMENT_TYPES).map((e) => `.${e}`),
  ...Object.values(OFFICE_DOCUMENT_TYPES),
].join(",");

const officeExt = (filename?: string) =>
  filename?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

/** An office document's content type by its filename (`undefined` when it is not one). */
export function officeContentType(filename?: string): string | undefined {
  return OFFICE_DOCUMENT_TYPES[officeExt(filename)];
}

/** True for a Word / Excel / OpenDocument file — by its extension, the type browsers send varies. */
export function isOfficeDocument(filename?: string): boolean {
  return officeContentType(filename) !== undefined;
}

export const MEDIA_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export function isPdfContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct === "application/pdf" || ct.endsWith("+pdf");
}

export function isImageContentType(contentType: string | undefined): boolean {
  return Boolean(contentType?.toLowerCase().startsWith("image/"));
}

export function isPdfFilename(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

export function isAllowedUploadContentType(
  contentType: string,
  filename?: string,
  opts: { documents?: boolean } = {},
): boolean {
  const ct = contentType.toLowerCase().trim();
  if (isImageContentType(ct) || isPdfContentType(ct)) return true;
  if (filename && isPdfFilename(filename)) return true;
  if (opts.documents && isOfficeDocument(filename)) return true;
  return false;
}

/** Raster images go through the cropper; PDF/SVG/GIF upload as-is. */
export function fileNeedsCrop(file: File): boolean {
  const type = file.type.toLowerCase();
  if (!type.startsWith("image/")) return false;
  if (type === "image/svg+xml" || type === "image/gif") return false;
  return true;
}
