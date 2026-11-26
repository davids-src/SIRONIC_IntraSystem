import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectAuthDb,
  PlatformUserModel,
  hashToken,
  resetLockout,
} from "@crm/auth-core/server";
import { setSessionCookie } from "@/lib/session-cookie";

const bodySchema = z.object({ email: z.string().email(), token: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 400 });
    }
    const { email, token } = parsed.data;

    await connectAuthDb();
    const now = new Date();
    // Single atomic op: matches on hash+expiry+status+lockout and clears the token in the
    // same write, so a link can never be consumed twice by a race, and a disabled/locked
    // account can't use a still-valid link to bypass the same gate password login enforces.
    const user = await PlatformUserModel.findOneAndUpdate(
      {
        email: email.toLowerCase(),
        magic_token_hash: hashToken(token),
        magic_token_expires: { $gt: now },
        status: "active",
        $or: [{ locked_until: null }, { locked_until: { $lte: now } }],
      },
      {
        $set: resetLockout(),
        $unset: { magic_token_hash: "", magic_token_expires: "" },
      },
      { new: true },
    ).lean<{ _id: unknown; email: string } | null>();

    if (!user) {
      return NextResponse.json(
        { error: "A link érvénytelen vagy lejárt." },
        { status: 401 },
      );
    }

    await setSessionCookie({ sub: String(user._id), email: user.email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bejelentkezés sikertelen." }, { status: 500 });
  }
}
