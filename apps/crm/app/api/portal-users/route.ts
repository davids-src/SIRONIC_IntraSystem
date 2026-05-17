import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ContactModel, PortalUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import type { RoleKey } from "@crm/types";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  contact_id: z.string().min(1),
  display_name: z.string().max(200).optional(),
  roleKeys: z.array(z.enum(["partner.admin", "partner.viewer"])).optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "view", scope: "global" });
    const url = new URL(req.url);
    const contactId = url.searchParams.get("contact_id");
    if (!contactId) {
      return NextResponse.json({ error: "Missing contact_id" }, { status: 400 });
    }

    return await withDb(async () => {
      const users = await PortalUserModel.find({
        tenantId: actor.tenantId,
        contact_id: contactId,
      }).lean();

      const safeUsers = users.map((u) => {
        const { password_hash, ...rest } = u as any;
        return rest;
      });
      return NextResponse.json(serializeForJson(safeUsers));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const contact = await ContactModel.findOne({
        _id: b.contact_id,
        tenantId: actor.tenantId,
      }).lean();
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 400 });
      }
      const password_hash = await bcrypt.hash(b.password, 12);
      const roleKeys = (b.roleKeys ?? ["partner.viewer"]) as RoleKey[];
      const doc = await PortalUserModel.create({
        tenantId: actor.tenantId,
        contact_id: b.contact_id,
        email: b.email.toLowerCase(),
        password_hash,
        display_name: b.display_name ?? null,
        roleKeys,
      });
      const obj = doc.toObject();
      delete (obj as any).password_hash;
      return NextResponse.json(serializeForJson(obj), { status: 201 });
    });
  } catch (e: any) {
    console.error("PORTAL USER POST ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: e.status || 500 },
    );
  }
}
