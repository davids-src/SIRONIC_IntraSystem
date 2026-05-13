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

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "admin", scope: "global" });
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
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
