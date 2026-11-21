import { notFound } from "next/navigation";
import { Label, Textarea } from "@erp/ui";
import {
  HIBAJEGY_ALLAPOT_LABELS,
  HIBAJEGY_ALLAPOT_TONES,
  HIBAJEGY_PRIORITAS_LABELS,
} from "@erp/szerviz/client";
import { PORTAL_PERMISSIONS } from "@erp/portal-auth/constants";
import { ActionForm } from "@/components/action-form";
import { Adat, Allapot, PageHeader } from "@/components/page";
import { commentTicketAction } from "@/lib/actions";
import { datumIdo } from "@/lib/format";
import { can } from "@/lib/nezo";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalHibajegy } from "@/lib/portal-api";

export const metadata = { title: "Hibajegy" };

export default async function HibajegyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await getPortalNezo();
  const h = await portalHibajegy(nezo, id);
  if (!h) notFound();
  const lezart = h.allapot === "lezart";
  return (
    <>
      <PageHeader
        title={`${h.azonosito} — ${h.targy}`}
        actions={
          <Allapot
            label={HIBAJEGY_ALLAPOT_LABELS[h.allapot]}
            tone={HIBAJEGY_ALLAPOT_TONES[h.allapot]}
          />
        }
      />
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        <Adat cimke="Prioritás">{HIBAJEGY_PRIORITAS_LABELS[h.prioritas]}</Adat>
        <Adat cimke="Kategória">{h.kategoria}</Adat>
        <Adat cimke="Helyszín">{h.helyszin ?? "—"}</Adat>
        <Adat cimke="Bejelentve">{datumIdo(h.createdAt)}</Adat>
        <Adat cimke="Utolsó módosítás">{datumIdo(h.updatedAt)}</Adat>
      </dl>
      <section className="mb-6">
        <h2 className="mb-2 font-medium">Leírás</h2>
        <p className="text-sm whitespace-pre-wrap">{h.leiras}</p>
      </section>
      {h.megoldasJegyzet && (
        <section className="mb-6 rounded border border-green-300 bg-green-50 p-4">
          <h2 className="mb-2 font-medium">Megoldás</h2>
          <p className="text-sm whitespace-pre-wrap">{h.megoldasJegyzet}</p>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-medium">Üzenetek</h2>
        <ul className="mb-4 flex flex-col gap-3">
          {h.megjegyzesek.length === 0 && (
            <li className="text-muted-foreground text-sm">Még nincs üzenet.</li>
          )}
          {h.megjegyzesek.map((m) => (
            <li
              key={m.id}
              className={`rounded border p-3 text-sm ${m.szerepkor === "partner" ? "bg-muted/40" : ""}`}
            >
              <p className="text-muted-foreground mb-1 text-xs">
                {m.szerepkor === "partner"
                  ? (m.szerzoNev ?? "Ön")
                  : "SIRONIC ügyfélszolgálat"}{" "}
                · {datumIdo(m.letrehozva)}
              </p>
              <p className="whitespace-pre-wrap">{m.uzenet}</p>
            </li>
          ))}
        </ul>
        {!lezart && can(nezo, PORTAL_PERMISSIONS.ticketComment) && (
          <ActionForm action={commentTicketAction} submitLabel="Üzenet küldése">
            <input type="hidden" name="id" value={h.id} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="uzenet">Új üzenet</Label>
              <Textarea id="uzenet" name="uzenet" required rows={3} maxLength={4000} />
            </div>
          </ActionForm>
        )}
      </section>
    </>
  );
}
