import { NextResponse } from "next/server";
import {
  MaintenancePlanModel,
  TicketModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { handleApiError, withDb } from "@/lib/api-helpers";
import { headers } from "next/headers";

/**
 * GET /api/cron/maintenance
 * Ezt a végpontot egy Vercel Cron Job hívja meg naponta.
 * Ellenőrzi a lejáró karbantartási terveket és létrehozza az automatikus hibajegyeket.
 *
 * Vercel cron.json konfiguráció:
 * { "crons": [{ "path": "/api/cron/maintenance", "schedule": "0 6 * * *" }] }
 */
export async function GET(req: Request) {
  // Biztonsági ellenőrzés: csak Vercel Cron hívhat meg
  const headersList = await headers();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = headersList.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await withDb(async () => {
      const now = new Date();
      const results: { tenantId: string; ticket_number: string; plan_title: string }[] =
        [];

      // Tervek, ahol a next_due_date az advance_days-en belül van, és még aktív
      // Mivel az advance_days tervenként változhat, le kell kérnünk mindet és szűrni
      const plans = await MaintenancePlanModel.find({ is_active: true }).lean();

      for (const plan of plans) {
        const dueDate = new Date(plan.next_due_date as Date);
        const advanceDays = (plan.advance_days as number) ?? 14;
        const triggerDate = new Date(
          dueDate.getTime() - advanceDays * 24 * 60 * 60 * 1000,
        );

        if (now < triggerDate) continue; // még nem esedékes

        // Ellenőrizzük: legutóbb generált-e már ebben a ciklusban
        const lastGenerated = plan.last_generated_at
          ? new Date(plan.last_generated_at as Date)
          : null;
        if (lastGenerated) {
          const daysSinceLastGen =
            (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24);
          const frequencyDays = (plan.frequency_months as number) * 30;
          if (daysSinceLastGen < frequencyDays * 0.8) continue; // már generált ebben a ciklusban
        }

        // Ticket generálás
        const tenantId = plan.tenantId as string;
        const n = await nextCounterValue(tenantId, "ticket");
        const ticket_number = formatNumber("TK", n);

        await TicketModel.create({
          tenantId,
          ticket_number,
          contact_id: plan.contact_id,
          project_id: plan.project_id ?? null,
          created_by: "system:cron",
          assigned_to: plan.template_assigned_to ?? null,
          source: "crm",
          priority: plan.template_priority,
          status: "new",
          category: plan.template_category,
          title: `[SLA] ${plan.template_title}`,
          description: plan.template_description ?? "",
          one_time_contact_name: null,
          one_time_contact_phone: null,
          location: null,
          affected_items: null,
          attachments: [],
          comments: [],
          resolution_notes: null,
          resolved_at: null,
        });

        // Következő esedékesség frissítése
        const nextDate = new Date(plan.next_due_date as Date);
        nextDate.setMonth(nextDate.getMonth() + (plan.frequency_months as number));

        await MaintenancePlanModel.findByIdAndUpdate(plan._id, {
          last_generated_at: now,
          next_due_date: nextDate,
        });

        results.push({ tenantId, ticket_number, plan_title: plan.title as string });
      }

      return NextResponse.json({
        processed: results.length,
        generated: results,
        ran_at: now.toISOString(),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
