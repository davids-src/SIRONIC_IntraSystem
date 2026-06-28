import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import * as React from "react";
import { CrmUserModel } from "@crm/db";
import { sendEmail } from "@sironic/emails";
import { handleApiError, withDb } from "@/lib/api-helpers";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

type CrmMagicUserLean = {
  _id: unknown;
  roleKeys?: string[];
};

function resolveBaseUrl(): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Kérjük, adj meg egy érvényes email címet." },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const user = (await CrmUserModel.findOne({
        email,
      }).lean()) as CrmMagicUserLean | null;
      if (
        !user ||
        !(user.roleKeys ?? []).some((k) => k === "crm.admin" || k === "crm.staff")
      ) {
        return NextResponse.json({ ok: true });
      }

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const magic_token_expires = new Date(Date.now() + MAGIC_LINK_TTL_MS);

      await CrmUserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            magic_token_hash: tokenHash,
            magic_token_expires,
          },
        },
      );

      const loginUrl = new URL("/login", resolveBaseUrl());
      loginUrl.searchParams.set("email", email);
      loginUrl.searchParams.set("magicToken", rawToken);

      await sendEmail({
        to: email,
        subject: "SIRONIC CRM - egyszeri bejelentkezési link",
        template: React.createElement(
          "div",
          {
            style: {
              fontFamily: "Arial, sans-serif",
              lineHeight: "1.6",
              color: "#111827",
            },
          },
          React.createElement("h2", null, "Egyszeri bejelentkezési link"),
          React.createElement(
            "p",
            null,
            "A lenti gombra kattintva 15 percen belul be tudsz jelentkezni a SIRONIC CRM rendszerbe.",
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
              "Belépek a CRM-be",
            ),
          ),
          React.createElement(
            "p",
            { style: { fontSize: "12px", color: "#6b7280" } },
            "Ha nem te kerted ezt a linket, figyelmen kivul hagyhatod ezt az emailt.",
          ),
        ),
      });

      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
