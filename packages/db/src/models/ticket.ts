import { defineSchema } from "./schema-def";
import { attachmentSchema, ticketCommentSchema } from "./embedded-schemas";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const ticketSchema = defineSchema(
  {
    ticket_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, default: null },
    one_time_contact_name: { type: String, default: null },
    one_time_contact_phone: { type: String, default: null },
    created_by: { type: String, required: true },
    assigned_to: { type: String, default: null },
    source: {
      type: String,
      enum: ["crm", "partner_portal", "phone", "email", "walk_in"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "in_progress", "waiting", "resolved", "closed"],
      required: true,
    },
    category: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    project_id: { type: String, default: null },
    location: { type: String, default: null },
    affected_items: { type: String, default: null },
    attachments: [attachmentSchema],
    comments: [ticketCommentSchema],
    resolution_notes: { type: String, default: null },
    resolved_at: { type: Date, default: null },
  },
  ts,
);

ticketSchema.index({ tenantId: 1, ticket_number: 1 }, { unique: true });

export const TicketModel = getModel("Ticket", ticketSchema);
