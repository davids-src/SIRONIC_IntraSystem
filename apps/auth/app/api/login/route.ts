import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectAuthDb,
  PlatformUserModel,
  verifyPassword,
  verifyTotpCode,
  decryptTotpSecret,
  matchRecoveryCode,
  isLockedOut,
  recordFailedAttemptAtomic,
  resetLockout,
} from "@crm/auth-core/server";
import { setSessionCookie } from "@/lib/session-cookie";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** TOTP code or a recovery code — only required when the account has 2FA enabled. */
  code: z.string().optional(),
});

type PlatformUserLean = {
  _id: unknown;
  email: string;
  password_hash: string | null;
  status: "active" | "disabled" | "locked";
  failed_login_count: number;
  locked_until: Date | null;
  totp: { enabled: boolean; encrypted_secret: string | null };
  recovery_codes_hashes: string[];
};

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 400 });
    }
    const { email, password, code } = parsed.data;

    await connectAuthDb();
    const user = (await PlatformUserModel.findOne({
      email: email.toLowerCase(),
    }).lean()) as PlatformUserLean | null;

    // Deliberately generic — never reveal whether the email exists.
    const invalidCredentials = () =>
      NextResponse.json({ error: "Hibás email vagy jelszó." }, { status: 401 });

    if (!user || !user.password_hash) return invalidCredentials();
    if (user.status !== "active") {
      return NextResponse.json({ error: "A fiók nem aktív." }, { status: 403 });
    }
    if (isLockedOut(user.locked_until)) {
      return NextResponse.json(
        { error: "A fiók átmenetileg zárolva, próbáld újra később." },
        { status: 423 },
      );
    }

    const passwordOk = await verifyPassword(password, user.password_hash);
    if (!passwordOk) {
      await recordFailedAttemptAtomic(user._id);
      return invalidCredentials();
    }

    if (user.totp.enabled) {
      if (!code) {
        return NextResponse.json({ totpRequired: true }, { status: 200 });
      }
      const totpOk =
        !!user.totp.encrypted_secret &&
        verifyTotpCode(code, decryptTotpSecret(user.totp.encrypted_secret));
      const recoveryMatch = !totpOk
        ? matchRecoveryCode(code, user.recovery_codes_hashes)
        : null;
      if (!totpOk && !recoveryMatch) {
        await recordFailedAttemptAtomic(user._id);
        return NextResponse.json({ error: "Érvénytelen kód." }, { status: 401 });
      }
      if (recoveryMatch) {
        await PlatformUserModel.updateOne(
          { _id: user._id },
          { $pull: { recovery_codes_hashes: recoveryMatch } },
        );
      }
    }

    await PlatformUserModel.updateOne({ _id: user._id }, { $set: resetLockout() });
    await setSessionCookie({ sub: String(user._id), email: user.email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bejelentkezés sikertelen." }, { status: 500 });
  }
}
