import { NextResponse } from "next/server";
import { z } from "zod";
import { PricingSettingsModel, ServiceCategoryModel, serializeForJson } from "@crm/db";
import { checkAndSeedServiceCategories } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const pricingSettingsSchema = z.object({
  overhead_multiplier: z.number().positive(),
  monthly_fixed_cost: z.number().min(0),
  monthly_productive_hours: z.number().positive(),
  hourly_rates: z.object({
    it_operations: z.number().min(0),
    it_development: z.number().min(0),
    security_tech_installer: z.number().min(0),
    security_tech_planner: z.number().min(0),
    fire_protection_installer: z.number().min(0),
    fire_protection_planner: z.number().min(0),
    electrical_general: z.number().min(0),
    electrical_industrial: z.number().min(0),
    project_management: z.number().min(0),
    consulting: z.number().min(0),
  }),
  client_multipliers: z.object({
    individual: z.number().positive(),
    smb_occasional: z.number().positive(),
    smb_6month: z.number().positive(),
    smb_1year: z.number().positive(),
    smb_2year: z.number().positive(),
    enterprise: z.number().positive(),
    subcontractor_presence: z.number().positive(),
    subcontractor_project: z.number().positive(),
    pm_external: z.number().positive(),
  }),
  material_surcharges: z.object({
    occasional: z.number().min(0),
    contracted: z.number().min(0),
    enterprise: z.number().min(0),
    subcontractor: z.number().min(0),
  }),
  urgency_multipliers: z.object({
    same_day: z.number().positive(),
    after_hours: z.number().positive(),
    weekend: z.number().positive(),
    night: z.number().positive(),
  }),
  vat_rate: z.number().min(0).max(1),
  min_callout_fee: z.number().min(0),
  min_project_fee: z.number().min(0),
});

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "pricing_settings", action: "view", scope: "global" });
    return await withDb(async () => {
      // Seed az alapértelmezett kategóriák ha még nincs
      await checkAndSeedServiceCategories(actor.tenantId, ServiceCategoryModel);

      let doc = await PricingSettingsModel.findOne({ tenantId: actor.tenantId }).lean();
      if (!doc) {
        // Első betöltéskor létrehozzuk az alapértelmezett beállításokkal
        const created = await PricingSettingsModel.create({ tenantId: actor.tenantId });
        doc = created.toObject();
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "pricing_settings", action: "manage", scope: "global" });
    const json: unknown = await req.json();
    const parsed = pricingSettingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const doc = await PricingSettingsModel.findOneAndUpdate(
        { tenantId: actor.tenantId },
        {
          $set: {
            ...parsed.data,
            updated_by: actor.actorId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
