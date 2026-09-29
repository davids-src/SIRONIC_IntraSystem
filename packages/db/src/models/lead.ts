import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const leadActivitySchema = defineSchema(
  {
    type: {
      type: String,
      enum: [
        "call",
        "email",
        "meeting",
        "note",
        "status_change",
        "offer_created",
        "follow_up",
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    user_id: { type: String, required: true },
    user_name: { type: String, required: true },
    text: { type: String, required: true },
    entity_type: { type: String, default: null },
    entity_id: { type: String, default: null },
  },
  { _id: true },
);

const leadSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    lead_number: { type: String, required: true },
    company_name: { type: String, required: true },
    contact_name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    website: { type: String, default: null },
    source: { type: String, default: null },
    category: { type: String, default: null },
    industry: { type: String, default: null },
    assigned_to: { type: String, default: null },
    assigned_user_name: { type: String, default: null },
    estimated_value: { type: Number, default: null },
    status: {
      type: String,
      enum: [
        "target",
        "contacted",
        "replied",
        "meeting",
        "quotation_needed",
        "quotation_sent",
        "follow_up",
        "negotiation",
        "won",
        "lost",
        "no_response",
        "later",
        "not_relevant",
      ],
      default: "target",
      required: true,
      index: true,
    },
    next_action: { type: String, default: null },
    next_action_at: { type: Date, default: null, index: true },
    next_action_assigned_to: { type: String, default: null },
    notes: { type: String, default: null },
    contact_id: { type: String, default: null, index: true },
    offer_id: { type: String, default: null },
    business_unit: { type: String, default: null },
    lost_reason: { type: String, default: null },
    lost_reason_custom: { type: String, default: null },
    activities: { type: [leadActivitySchema], default: [] },
  },
  ts,
);

leadSchema.index({ tenantId: 1, lead_number: 1 }, { unique: true });

export const LeadModel = getModel("Lead", leadSchema);
