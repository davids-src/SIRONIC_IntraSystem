import { NextResponse } from "next/server";
import { PortalUserModel } from "@crm/db";
import { withDb, handleApiError } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Érvénytelen kérés. A jelszónak legalább 8 karakter hosszúnak kell lennie.",
        },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const user = await PortalUserModel.findOne({
        invite_token: token,
        invite_token_expires: { $gt: new Date() },
      });

      if (!user) {
        return NextResponse.json(
          { error: "A link érvénytelen vagy lejárt. Kérjen új meghívót." },
          { status: 400 },
        );
      }

      const password_hash = await bcrypt.hash(password, 12);
      await PortalUserModel.updateOne(
        { _id: user._id },
        {
          $set: { password_hash },
          $unset: { invite_token: "", invite_token_expires: "" },
        },
      );

      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
