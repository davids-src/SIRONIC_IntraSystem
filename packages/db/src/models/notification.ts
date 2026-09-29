import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const notificationSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entity_type: { type: String, default: null },
    entity_id: { type: String, default: null },
    href: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

const notificationPreferenceSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    event_type: { type: String, required: true },
    channel: { type: String, enum: ["in_app", "email"], required: true },
    enabled: { type: Boolean, default: true },
  },
  ts,
);

notificationPreferenceSchema.index(
  { tenantId: 1, user_id: 1, event_type: 1, channel: 1 },
  { unique: true },
);

export const NotificationModel = getModel("Notification", notificationSchema);
export const NotificationPreferenceModel = getModel(
  "NotificationPreference",
  notificationPreferenceSchema,
);
