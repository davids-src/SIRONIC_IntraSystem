import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  connectDb,
  TenantModel,
  CrmUserModel,
  SettingsModel,
  serializeForJson,
} from "@crm/db";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantName: z.string().min(1).max(200),
  displayName: z.string().max(200).optional(),
});

function defaultSettingsDoc(tenantId: string) {
  return {
    tenantId,
    ticket_categories: ["Hálózat", "Szoftver", "Hardver", "Egyéb"],
    worklog_categories: ["Kiszállás", "Távoli támogatás", "Projekt", "Karbantartás"],
    project_categories: ["Telepítés", "Fejlesztés", "Üzemeltetés"],
    contract_categories: ["SLA", "Projekt", "Egyszeri"],
    price_list_categories: ["Szolgáltatás", "Termék", "Munkadíj", "Csomag"],
    worklog_units: ["óra", "db", "km", "nap"],
    contact_tags: ["VIP", "SLA", "Kritikus"],
  };
}

export async function POST(req: Request) {
  try {
    await connectDb();
    const existing = await CrmUserModel.estimatedDocumentCount();
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
    const { email, password, tenantName, displayName } = parsed.data;
    const password_hash = await bcrypt.hash(password, 12);
    const tenant = await TenantModel.create({ name: tenantName });
    const tenantId = String(tenant._id);
    await SettingsModel.create(defaultSettingsDoc(tenantId));
    const user = await CrmUserModel.create({
      tenantId,
      email: email.toLowerCase(),
      display_name: displayName ?? null,
      password_hash,
      roleKeys: ["crm.admin"],
    });
    return NextResponse.json(
      serializeForJson({
        ok: true,
        tenantId,
        userId: String(user._id),
      }),
      { status: 201 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDb();
    const count = await CrmUserModel.estimatedDocumentCount();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { needsSetup: true, error: "db_unavailable" },
      { status: 503 },
    );
  }
}
