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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  image_url: z.string().url().or(z.string().startsWith("/")).optional(),
  markers: z.array(markerSchema).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "floorplan", action: "view", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const doc = await FloorplanModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) return NextResponse.json({ error: "Nem található" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "floorplan", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const doc = await FloorplanModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: parsed.data },
        { new: true },
      ).lean();
      if (!doc) return NextResponse.json({ error: "Nem található" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "floorplan", action: "write", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      await FloorplanModel.findOneAndDelete({ _id: id, tenantId: actor.tenantId });
      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
