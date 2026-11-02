import { NextResponse } from "next/server";
import { z } from "zod";
import * as React from "react";
import {
  connectAuthDb,
  PlatformUserModel,
  generateVerificationToken,
  MAGIC_LINK_TTL_MS,
} from "@crm/auth-core";
import { sendEmail } from "@sironic/emails";

const bodySchema = z.object({ email: z.string().email() });

function resolveBaseUrl(): string {
  return (
    process.env.AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3005"
  );
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen email cím." }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();

    await connectAuthDb();
    const user = await PlatformUserModel.findOne({ email }).lean<{ _id: unknown }>();
    // Always return ok — never reveal whether the email exists.
    if (!user) return NextResponse.json({ ok: true });

    const { token, token_hash, expires_at } =
      generateVerificationToken(MAGIC_LINK_TTL_MS);
    await PlatformUserModel.updateOne(
      { _id: user._id },
      { $set: { magic_token_hash: token_hash, magic_token_expires: expires_at } },
    );

    const loginUrl = new URL("/login", resolveBaseUrl());
    loginUrl.searchParams.set("email", email);
    loginUrl.searchParams.set("magicToken", token);

    await sendEmail({
      to: email,
      subject: "Sironic — egyszeri bejelentkezési link",
      template: React.createElement(
        "div",
        {
          style: { fontFamily: "Arial, sans-serif", lineHeight: "1.6", color: "#111827" },
        },
        React.createElement("h2", null, "Egyszeri bejelentkezési link"),
        React.createElement(
          "p",
          null,
          "A lenti gombra kattintva 15 percen belül be tudsz jelentkezni a Sironic fiókoddal.",
        ),
        React.createElement(
          "p",
          null,
          React.createElement(
            "a",
            {
              href: loginUrl.toString(),
              style: {
                display: "inline-block",
                padding: "10px 16px",
                background: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "8px",
              },
            },
            "Belépés",
          ),
        ),
        React.createElement(
          "p",
          { style: { fontSize: "12px", color: "#6b7280" } },
          "Ha nem te kérted ezt a linket, figyelmen kívül hagyhatod ezt az emailt.",
        ),
      ),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kérés sikertelen." }, { status: 500 });
  }
}
