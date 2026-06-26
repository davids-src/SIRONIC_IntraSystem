import { NextResponse } from "next/server";
import { z } from "zod";
import { ContactModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string(),
  country: z.string(),
});

const contactPersonSchema = z.object({
  name: z.string(),
  title: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  is_primary: z.boolean(),
});

const createSchema = z.object({
  type: z.enum(["company", "individual", "one_time"]),
  name: z.string().min(1),
  short_name: z.string().nullable().optional(),
  tax_number: z.string().nullable().optional(),
  registration_number: z.string().nullable().optional(),
  address: addressSchema,
  billing_address: addressSchema.nullable().optional(),
  contact_persons: z.array(contactPersonSchema).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  has_portal_access: z.boolean().optional(),
  portal_permissions: z
    .object({
      menu_tickets: z.boolean(),
      menu_worklogs: z.boolean(),
      menu_offers: z.boolean(),
      menu_completion_certificates: z.boolean(),
      menu_projects: z.boolean(),
      menu_contracts: z.boolean(),
      menu_invoices: z.boolean(),
      menu_company_profile: z.boolean(),
      menu_settings: z.boolean(),
    })
    .optional(),
  active_services: z.array(z.string()).optional(),
  contract_type: z
    .enum(["project", "ongoing", "mixed", "one_time"])
    .nullable()
    .optional(),
  partner_role: z
    .enum(["client", "subcontractor_employer", "supplier", "mixed"])
    .optional(),
  client_category: z.enum(["individual", "smb", "enterprise"]).optional(),
  pricing_contract_type: z.enum(["occasional", "6month", "1year", "2year"]).optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    console.log("ACTOR IN GET /api/contacts:", actor);
    guard(actor, { module: "contact", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (q) {
        filter.$or = [
          { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { contact_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await ContactModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    console.log("ACTOR IN POST /api/contacts:", actor);
    guard(actor, { module: "contact", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "contact");
      const contact_number = formatNumber("CT", n);
      const partner_id = "VE" + String(Math.floor(100000 + Math.random() * 900000));
      const doc = await ContactModel.create({
        tenantId: actor.tenantId,
        contact_number,
        partner_id,
        type: b.type,
        name: b.name,
        short_name: b.short_name ?? null,
        tax_number: b.tax_number ?? null,
        registration_number: b.registration_number ?? null,
        address: b.address,
        billing_address: b.billing_address ?? null,
        contact_persons: b.contact_persons ?? [],
        phone: b.phone ?? null,
        email: b.email ?? null,
        notes: b.notes ?? null,
        tags: b.tags ?? [],
        has_portal_access: b.has_portal_access ?? false,
        portal_permissions: b.portal_permissions ?? {
          menu_tickets: true,
          menu_worklogs: true,
          menu_offers: true,
          menu_completion_certificates: true,
          menu_projects: true,
          menu_contracts: true,
          menu_invoices: true,
          menu_company_profile: true,
          menu_settings: true,
        },
        active_services: b.active_services ?? [],
        contract_type: b.contract_type ?? null,
        partner_role: b.partner_role ?? "client",
        client_category: b.client_category ?? "smb",
        pricing_contract_type: b.pricing_contract_type ?? "occasional",
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
