import { NextResponse } from "next/server";
import {
  CompletionCertificateModel,
  ContactModel,
  ContractModel,
  InvoiceModel,
  ProjectModel,
  TicketModel,
  WorklogModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

function fmtHuDate(d: Date): string {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function daysFromNow(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function relTimeHu(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 120) return "az imént";
  if (sec < 3600) return `${Math.floor(sec / 60)} perce`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} órája`;
  if (sec < 172800) return "tegnap";
  return `${Math.floor(sec / 86400)} napja`;
}

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "dashboard", action: "view", scope: "global" });

    return await withDb(async () => {
      const tenantId = actor.tenantId;
      const contacts = await ContactModel.find({ tenantId }).select("_id name").lean();
      const contactName = new Map<string, string>(
        contacts.map((c) => [String(c._id), c.name]),
      );

      const [
        ticketsOpen,
        projectsActive,
        invoicesDue,
        contractsSent,
        certsSent,
        ticketsRecent,
        worklogsRecent,
        contractsRecent,
        certsRecent,
        projectsWithDeadline,
        contractsRenewal,
      ] = await Promise.all([
        TicketModel.countDocuments({
          tenantId,
          status: { $nin: ["closed", "resolved"] },
        }),
        ProjectModel.countDocuments({ tenantId, status: { $in: ["open", "on_hold"] } }),
        InvoiceModel.countDocuments({
          tenantId,
          status: { $in: ["sent", "overdue"] },
        }),
        ContractModel.countDocuments({ tenantId, status: "sent" }),
        CompletionCertificateModel.countDocuments({ tenantId, status: "sent" }),
        TicketModel.find({ tenantId }).sort({ updated_at: -1 }).limit(4).lean(),
        WorklogModel.find({ tenantId }).sort({ updated_at: -1 }).limit(3).lean(),
        ContractModel.find({ tenantId }).sort({ updated_at: -1 }).limit(3).lean(),
        CompletionCertificateModel.find({ tenantId })
          .sort({ updated_at: -1 })
          .limit(2)
          .lean(),
        ProjectModel.find({
          tenantId,
          deadline: { $ne: null },
          status: { $in: ["open", "on_hold"] },
        })
          .sort({ deadline: 1 })
          .limit(12)
          .lean(),
        ContractModel.find({
          tenantId,
          valid_until: { $ne: null },
          status: { $nin: ["cancelled"] },
        })
          .sort({ valid_until: 1 })
          .limit(8)
          .lean(),
      ]);

      type ActivityKind = "ticket" | "worklog" | "contract" | "certificate";
      const activity: {
        id: string;
        kind: ActivityKind;
        description: string;
        timeLabel: string;
        at: string;
      }[] = [];

      for (const t of ticketsRecent) {
        const cn = t.contact_id ? contactName.get(t.contact_id) : null;
        activity.push({
          id: `t-${t._id}`,
          kind: "ticket",
          description: `Ticket ${t.ticket_number}${cn ? ` — ${cn}` : ""}: ${t.title}`,
          timeLabel: relTimeHu(new Date(t.updated_at as Date)),
          at: new Date(t.updated_at as Date).toISOString(),
        });
      }
      for (const w of worklogsRecent) {
        activity.push({
          id: `w-${w._id}`,
          kind: "worklog",
          description: `${w.worklog_number} — ${w.technician_name} (${w.status === "finalized" ? "lezárva" : "piszkozat"})`,
          timeLabel: relTimeHu(new Date(w.updated_at as Date)),
          at: new Date(w.updated_at as Date).toISOString(),
        });
      }
      for (const c of contractsRecent) {
        const cn = contactName.get(c.contact_id) ?? "";
        activity.push({
          id: `c-${c._id}`,
          kind: "contract",
          description: `Szerződés ${c.contract_number}${cn ? ` — ${cn}` : ""}: ${c.name}`,
          timeLabel: relTimeHu(new Date(c.updated_at as Date)),
          at: new Date(c.updated_at as Date).toISOString(),
        });
      }
      for (const cc of certsRecent) {
        const cn = cc.contact_id ? (contactName.get(cc.contact_id) ?? "") : "";
        activity.push({
          id: `cc-${cc._id}`,
          kind: "certificate",
          description: `Igazolás ${cc.certificate_number}${cn ? ` — ${cn}` : ""}: ${cc.title}`,
          timeLabel: relTimeHu(new Date(cc.updated_at as Date)),
          at: new Date(cc.updated_at as Date).toISOString(),
        });
      }

      activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      const recentActivity = activity.slice(0, 8);

      const now = Date.now();
      const in60d = now + 60 * 24 * 60 * 60 * 1000;

      const deadlineRows: {
        sortAt: number;
        id: string;
        kind: "project" | "contract";
        name: string;
        type: string;
        contact: string;
        date: string;
        badge: string;
        urgent: boolean;
      }[] = [];

      for (const p of projectsWithDeadline) {
        const dl = p.deadline ? new Date(p.deadline as Date) : null;
        if (!dl || dl.getTime() < now - 86400000) continue;
        const d = daysFromNow(dl);
        const cn = p.contact_id ? (contactName.get(p.contact_id) ?? "—") : "—";
        deadlineRows.push({
          sortAt: dl.getTime(),
          id: String(p._id),
          kind: "project",
          name: p.name,
          type: "Projekt",
          contact: cn,
          date: fmtHuDate(dl),
          badge: d < 0 ? "Lejárt" : d <= 7 ? "Kritikus" : `${d} nap`,
          urgent: d >= 0 && d <= 7,
        });
      }

      for (const c of contractsRenewal) {
        const vu = c.valid_until ? new Date(c.valid_until as Date) : null;
        if (!vu || vu.getTime() > in60d) continue;
        const d = daysFromNow(vu);
        const cn = contactName.get(c.contact_id) ?? "—";
        deadlineRows.push({
          sortAt: vu.getTime(),
          id: String(c._id),
          kind: "contract",
          name: c.name,
          type: "Szerződés",
          contact: cn,
          date: fmtHuDate(vu),
          badge: d < 0 ? "Lejárt" : d <= 14 ? "Kritikus" : `${d} nap`,
          urgent: d >= 0 && d <= 14,
        });
      }

      deadlineRows.sort((a, b) => a.sortAt - b.sortAt);
      const upcomingDeadlines = deadlineRows
        .slice(0, 12)
        .map(({ sortAt: _s, ...rest }) => rest);

      const signatureQueue: {
        id: string;
        kind: "contract" | "certificate";
        number: string;
        name: string;
        contact: string;
        href: string;
      }[] = [];

      const sentContracts = await ContractModel.find({ tenantId, status: "sent" })
        .sort({ updated_at: -1 })
        .limit(10)
        .lean();
      for (const c of sentContracts) {
        signatureQueue.push({
          id: String(c._id),
          kind: "contract",
          number: c.contract_number,
          name: c.name,
          contact: contactName.get(c.contact_id) ?? "—",
          href: `/contracts/${c._id}`,
        });
      }
      const sentCerts = await CompletionCertificateModel.find({
        tenantId,
        status: "sent",
      })
        .sort({ updated_at: -1 })
        .limit(10)
        .lean();
      for (const cc of sentCerts) {
        signatureQueue.push({
          id: String(cc._id),
          kind: "certificate",
          number: cc.certificate_number,
          name: cc.title,
          contact: cc.contact_id ? (contactName.get(cc.contact_id) ?? "—") : "—",
          href: `/completion-certificates/${cc._id}`,
        });
      }

      const payload = {
        stats: {
          openTickets: ticketsOpen,
          activeProjects: projectsActive,
          invoicesAwaiting: invoicesDue,
          pendingSignatures: contractsSent + certsSent,
        },
        recentActivity,
        upcomingDeadlines,
        pendingSignatures: signatureQueue.slice(0, 12),
      };

      return NextResponse.json(serializeForJson(payload));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
