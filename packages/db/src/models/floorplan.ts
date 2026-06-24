import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const floorplanSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    project_id: { type: String, default: null, index: true },
    name: { type: String, required: true }, // pl. "1. emelet - Irodaház"
    image_url: { type: String, required: true }, // feltöltött alap PDF/PNG/SVG URL
    markers: [
      {
        marker_id: { type: String, required: true }, // nanoid
        x_percent: { type: Number, required: true }, // 0-100 - relatív pozíció
        y_percent: { type: Number, required: true }, // 0-100 - relatív pozíció
        label: { type: String },
        // Kapcsolódó entitások (opcionális hivatkozások)
        ticket_id: { type: String, default: null },
        asset_id: { type: String, default: null }, // pl. egy Tool ID
        // Eszköz típus ikon megjelenítéséhez
        marker_type: {
          type: String,
          enum: [
            "camera",
            "ap",
            "switch",
            "rack",
            "socket",
            "sensor",
            "router",
            "server",
            "other",
          ],
          default: "other",
        },
        description: { type: String },
      },
    ],
    created_by: { type: String, required: true },
  },
  ts,
);

export const FloorplanModel = getModel("Floorplan", floorplanSchema);
