import { NextResponse } from "next/server";
import { SecretShareModel, SecretModel, serializeForJson } from "@crm/db";
import { handleApiError, withDb } from "@/lib/api-helpers";
import { headers } from "next/headers";
import crypto from "crypto";

/**
 * POST /api/public/secret-reveal
 * Publikus végpont – token alapján visszafejti a titkos adatot.
 * NEM igényel bejelentkezést (partner portál publikus oldala hívja).
 */
export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const { token } = json as { token?: string };

    if (!token || token.length < 10) {
      return NextResponse.json({ error: "Érvénytelen token" }, { status: 400 });
    }

    // IP cím naplózáshoz
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

    return await withDb(async () => {
      const share = await SecretShareModel.findOne({ token });

      if (!share) {
        return NextResponse.json(
          { error: "A megosztási link nem létezik vagy már felhasználásra került." },
          { status: 404 },
        );
      }

      // Ellenőrzés: lejárt-e
      if (new Date() > new Date(share.expires_at as Date)) {
        return NextResponse.json({ error: "A megosztási link lejárt." }, { status: 410 });
      }

      // Ellenőrzés: max megtekintések
      if ((share.view_count as number) >= (share.view_count_limit as number)) {
        return NextResponse.json(
          { error: "A megosztási link elérte a maximális megtekintési korlátot." },
          { status: 410 },
        );
      }

      // Titkos adat lekérése és visszafejtése
      const secret = await SecretModel.findById(share.secret_id);
      if (!secret) {
        return NextResponse.json(
          { error: "A titkos adat nem található." },
          { status: 404 },
        );
      }

      const encKey = process.env.SECRETS_ENCRYPTION_KEY;
      if (!encKey) {
        return NextResponse.json(
          { error: "Szerver konfigurációs hiba." },
          { status: 500 },
        );
      }

      // AES-256-GCM visszafejtés (iv:authTag:ciphertext formátum)
      const [ivHex, authTagHex, cipherHex] = (secret.encrypted_value as string).split(
        ":",
      );
      if (!ivHex || !authTagHex || !cipherHex) {
        return NextResponse.json(
          { error: "Hibás titkosítási formátum." },
          { status: 500 },
        );
      }

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        Buffer.from(encKey, "hex"),
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

      const decrypted =
        decipher.update(cipherHex, "hex", "utf8") + decipher.final("utf8");

      // Megtekintési számláló frissítése
      await SecretShareModel.findByIdAndUpdate(share._id, {
        $inc: { view_count: 1 },
        $set: { viewed_at: share.viewed_at ?? new Date() },
        $push: { ip_address_log: ip },
      });

      return NextResponse.json({
        key: secret.key,
        value: decrypted,
        views_remaining:
          (share.view_count_limit as number) - (share.view_count as number) - 1,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
