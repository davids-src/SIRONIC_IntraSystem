import { NextResponse } from "next/server";
import { z } from "zod";
import { FloorplanModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const markerSchema = z.object({
  marker_id: z.string().min(1),
  x_percent: z.number().min(0).max(100),
  y_percent: z.number().min(0).max(100),
  label: z.string().optional().nullable(),
  ticket_id: z.string().optional().nullable(),
  asset_id: z.string().optional().nullable(),
  marker_type: z.enum([
    "camera",
    "ap",
    "switch",
    "rack",
    "socket",
    "sensor",
    "router",
    "server",
    "other",
  ]),
  description: z.string().optional().nullable(),
});

const createSchema = z.object({
  name: z.string().min(1),
  contact_id: z.string().min(1),
  project_id: z.string().optional().nullable(),
  image_url: z.string(),
  markers: z.array(markerSchema).default([]),
});

/**
 * GET /api/floorplans
 * Returns all floorplans for the tenant, optionally filtered by contact_id.
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "floorplan", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contact_id) filter.contact_id = contact_id;
      const rows = await FloorplanModel.find(filter).sort({ created_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/floorplans
 * Creates a new floorplan.
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "floorplan", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await FloorplanModel.create({
        tenantId: actor.tenantId,
        name: b.name,
        contact_id: b.contact_id,
        project_id: b.project_id ?? null,
        image_url: b.image_url,
        markers: b.markers,
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
