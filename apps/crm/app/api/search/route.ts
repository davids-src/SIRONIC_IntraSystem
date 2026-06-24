import { NextResponse } from "next/server";
import {
  ContactModel,
  ProjectModel,
  TicketModel,
  WorklogModel,
  StockItemModel,
  PriceListItemModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

/**
 * GET /api/search?q=XYZ
 * Globális Gyorskereső – párhuzamos lekérdezés több gyűjteményre.
 * Max 5 találat entitásonként.
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "ticket", action: "view", scope: "global" }); // alap view jog elég

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const tenant = actor.tenantId;
    const limit = 5;

    return await withDb(async () => {
      const [contacts, projects, tickets, worklogs, stockItems] = await Promise.all([
        ContactModel.find({ tenantId: tenant, $or: [{ name: re }, { tax_number: re }] })
          .select("_id name type")
          .limit(limit)
          .lean(),
        ProjectModel.find({
          tenantId: tenant,
          $or: [{ name: re }, { project_number: re }],
        })
          .select("_id name project_number status")
          .limit(limit)
          .lean(),
        TicketModel.find({
          tenantId: tenant,
          $or: [{ title: re }, { ticket_number: re }],
        })
          .select("_id ticket_number title status priority")
          .limit(limit)
          .lean(),
        WorklogModel.find({
          tenantId: tenant,
          $or: [{ worklog_number: re }, { title: re }],
        })
          .select("_id worklog_number title status")
          .limit(limit)
          .lean(),
        StockItemModel.find({ tenantId: tenant })
          .populate({
            path: "price_list_item_id",
            match: { $or: [{ name: re }, { sku: re }] },
            select: "name sku code",
          })
          .limit(limit * 2)
          .lean()
          .then((items) =>
            items.filter((i: any) => i.price_list_item_id != null).slice(0, limit),
          ),
      ]);

      const results: Array<{
        type: string;
        id: string;
        label: string;
        subtitle?: string;
        href: string;
        badge?: string;
      }> = [];

      contacts.forEach((c: any) => {
        results.push({
          type: "contact",
          id: c._id.toString(),
          label: c.name,
          subtitle: c.type,
          href: `/partners/${c._id}`,
          badge: "Partner",
        });
      });
      projects.forEach((p: any) => {
        results.push({
          type: "project",
          id: p._id.toString(),
          label: p.name,
          subtitle: p.project_number,
          href: `/projects/${p._id}`,
          badge: "Projekt",
        });
      });
      tickets.forEach((t: any) => {
        results.push({
          type: "ticket",
          id: t._id.toString(),
          label: t.title,
          subtitle: t.ticket_number,
          href: `/tickets/${t._id}`,
          badge: "Ticket",
        });
      });
      worklogs.forEach((w: any) => {
        results.push({
          type: "worklog",
          id: w._id.toString(),
          label: w.title ?? w.worklog_number,
          subtitle: w.worklog_number,
          href: `/worklogs/${w._id}`,
          badge: "Munkalap",
        });
      });
      stockItems.forEach((s: any) => {
        const item = s.price_list_item_id as any;
        results.push({
          type: "stock",
          id: s._id.toString(),
          label: item.name,
          subtitle: item.sku ?? item.code,
          href: `/inventory`,
          badge: "Raktár",
        });
      });

      return NextResponse.json(serializeForJson(results));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
