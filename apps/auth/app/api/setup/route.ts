import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectAuthDb,
  PlatformUserModel,
  hashPassword,
  claimSetupLock,
} from "@crm/auth-core";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().max(200).optional(),
});

/** Mirrors apps/crm's /api/setup pattern: open only until the first PlatformUser exists. */
export async function GET() {
  try {
    await connectAuthDb();
    const count = await PlatformUserModel.estimatedDocumentCount();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { needsSetup: true, error: "db_unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectAuthDb();
    const existing = await PlatformUserModel.estimatedDocumentCount();
    if (existing > 0) {
      return NextResponse.json({ error: "Already configured" }, { status: 403 });
    }
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Validate first, claim the lock second: a concurrent request that loses the race below
    // gets a clean "already configured" instead of silently creating a second admin — the
    // single atomic insert is what actually prevents the double-create, not this count check.
    const claimed = await claimSetupLock();
    if (!claimed) {
      return NextResponse.json({ error: "Already configured" }, { status: 403 });
    }

    const { email, password, displayName } = parsed.data;
    const password_hash = await hashPassword(password);
    const user = await PlatformUserModel.create({
      email: email.toLowerCase(),
      display_name: displayName ?? null,
      password_hash,
      email_verified_at: new Date(),
    });
    return NextResponse.json({ ok: true, userId: String(user._id) }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
