import type {
  CompletionCertificate,
  Contract,
  InventoryItem,
  Invoice,
  Offer,
  Project,
  Ticket,
  TicketComment,
  Worklog,
} from "@crm/types";

export function parseTicket(raw: unknown): Ticket {
  const r = raw as Record<string, unknown>;
  const commentsRaw = Array.isArray(r.comments) ? r.comments : [];
  const comments = commentsRaw.map((c: unknown) => {
    const x = c as Record<string, unknown>;
    return {
      ...(x as unknown as TicketComment),
      created_at: new Date(String(x.created_at)),
    };
  });
  const attRaw = Array.isArray(r.attachments) ? r.attachments : [];
  const attachments = attRaw.map((a) => {
    const x = a as Record<string, unknown>;
    return {
      filename: String(x.filename ?? ""),
      url: String(x.url ?? ""),
      size: Number(x.size) || 0,
      uploaded_at: new Date(String(x.uploaded_at)),
    };
  });
  return {
    ...(r as unknown as Ticket),
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
    resolved_at: r.resolved_at ? new Date(String(r.resolved_at)) : null,
    comments,
    attachments,
  };
}

export function parseWorklog(raw: unknown): Worklog {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Worklog),
    work_date: new Date(String(r.work_date)),
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
    items: Array.isArray(r.items) ? (r.items as Worklog["items"]) : [],
  };
}

export function parseProject(raw: unknown): Project {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Project),
    start_date: r.start_date ? new Date(String(r.start_date)) : null,
    deadline: r.deadline ? new Date(String(r.deadline)) : null,
    closed_at: r.closed_at ? new Date(String(r.closed_at)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

export function parseContract(raw: unknown): Contract {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Contract),
    valid_from: r.valid_from ? new Date(String(r.valid_from)) : null,
    valid_until: r.valid_until ? new Date(String(r.valid_until)) : null,
    signed_at: r.signed_at ? new Date(String(r.signed_at)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

export function parseOffer(raw: unknown): Offer {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Offer),
    valid_until: r.valid_until ? new Date(String(r.valid_until)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

export function parseInvoice(raw: unknown): Invoice {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Invoice),
    issued_at: r.issued_at ? new Date(String(r.issued_at)) : null,
    due_at: r.due_at ? new Date(String(r.due_at)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

export function parseCompletionCertificate(raw: unknown): CompletionCertificate {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as CompletionCertificate),
    work_period_start: r.work_period_start ? new Date(String(r.work_period_start)) : null,
    work_period_end: r.work_period_end ? new Date(String(r.work_period_end)) : null,
    signed_at: r.signed_at ? new Date(String(r.signed_at)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

export function parseInventoryItem(raw: unknown): InventoryItem {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as InventoryItem),
    warranty_end: r.warranty_end ? new Date(String(r.warranty_end)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}
