import { ImageResponse } from "next/og";
import { PwaIconMarkup } from "@/lib/pwa/icon-markup";
import { getCustomPwaIconSrc } from "@/lib/pwa/icon-source";

const ALLOWED_SIZES = new Set(["192", "512"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size } = await context.params;
  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  const px = Number(size);

  const customSrc = await getCustomPwaIconSrc();

  return new ImageResponse(<PwaIconMarkup size={px} customSrc={customSrc} />, {
    width: px,
    height: px,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
