import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import {
  HIBAJEGY_ALLAPOT_LABELS,
  HIBAJEGY_ATMENETEK,
  HIBAJEGY_FORRAS_LABELS,
  HIBAJEGY_PRIORITAS_LABELS,
  SZERVIZ_PERMISSIONS as P,
} from "@erp/szerviz/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivHibajegyAction,
  hibajegyAllapotAction,
  hibajegyFelelosAction,
  hibajegyMegjegyzesAction,
  visszaallitHibajegyAction,
} from "../../actions";
import {
  AllapotUrlap,
  FelelosUrlap,
  MegjegyzesUrlap,
} from "../../_components/hibajegy-panelek";

const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;
const datumIdo = (iso: string) => new Date(iso).toLocaleString("hu-HU");

export default async function HibajegyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.hibajegyRead);
  const belso = user.permissions.includes(P.hibajegyBelso);
  const h = await szervizApi.getHibajegy(id, {
    kind: "staff",
    userId: user.id,
    belsoLathato: belso,
  });
  if (!h) notFound();
  const [canWrite, canDelete, canMunkalap, felhasznalok] = await Promise.all([
    hasPermission(P.hibajegyWrite),
    hasPermission(P.hibajegyDelete),
    hasPermission(P.munkalapWrite),
    canWriteList(),
  ]);
  async function canWriteList() {
    return (await hasPermission(P.hibajegyWrite)) ? szervizApi.listFelhasznalok() : [];
  }
  const szerkesztheto = canWrite && !h.archivalt;

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={h.targy}
        subtitle={`${h.azonosito} · ${h.partnerNev ?? h.egyszeriNev ?? "—"}`}
        chips={
          <>
            <Badge variant="secondary">{HIBAJEGY_ALLAPOT_LABELS[h.allapot]}</Badge>
            <Badge variant="outline">{HIBAJEGY_PRIORITAS_LABELS[h.prioritas]}</Badge>
            {h.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
        actions={
          <>
            {szerkesztheto && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/szerviz/hibajegyek/${h.id}/edit`}>
                  <PencilIcon className="mr-1 size-4" />
                  Szerkesztés
                </Link>
              </Button>
            )}
            {canMunkalap && !h.archivalt && (
              <Button asChild size="sm">
                <Link
                  href={`/szerviz/munkalapok/new?hibajegyId=${h.id}${h.partnerId ? `&partnerId=${h.partnerId}` : ""}`}
                >
                  Munkalap indítása
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Section title="Adatok">
        <Facts
          items={[
            { label: "Forrás", value: HIBAJEGY_FORRAS_LABELS[h.forras] },
            { label: "Kategória", value: h.kategoria },
            { label: "Felelős", value: h.felelosNev },
            { label: "Helyszín", value: h.helyszin },
            { label: "Érintett tételek", value: h.erintettTetelek },
            { label: "Egyszeri ügyfél", value: h.egyszeriNev },
            { label: "Telefon", value: h.egyszeriTelefon },
            { label: "Projekt", value: h.projektId },
            { label: "Felvéve", value: datum(h.createdAt) },
            { label: "Megoldva", value: datum(h.megoldva) },
          ]}
        />
        <p className="text-sm whitespace-pre-line">{h.leiras}</p>
        {h.megoldasJegyzet && (
          <p className="bg-muted rounded p-2 text-sm whitespace-pre-line">
            <strong>Megoldás:</strong> {h.megoldasJegyzet}
          </p>
        )}
        {h.belsoJegyzet && (
          <p className="rounded border border-yellow-300 bg-yellow-50 p-2 text-sm whitespace-pre-line dark:bg-yellow-950">
            <strong>Belső jegyzet:</strong> {h.belsoJegyzet}
          </p>
        )}
      </Section>

      <Section title="Megjegyzések">
        {h.megjegyzesek.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs megjegyzés.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {h.megjegyzesek.map((m) => (
              <li
                key={m.id}
                className={
                  m.belso
                    ? "rounded border border-yellow-300 bg-yellow-50 p-2 text-sm dark:bg-yellow-950"
                    : "rounded border p-2 text-sm"
                }
              >
                <div className="text-muted-foreground mb-1 text-xs">
                  {m.szerzoNev} · {datumIdo(m.letrehozva)}
                  {m.szerepkor === "partner" && " · partner"}
                  {m.belso && " · Belső megjegyzés"}
                </div>
                <p className="whitespace-pre-line">{m.uzenet}</p>
              </li>
            ))}
          </ul>
        )}
        {szerkesztheto && (
          <MegjegyzesUrlap
            action={hibajegyMegjegyzesAction.bind(null, h.id)}
            belsoEngedett={belso}
          />
        )}
      </Section>

      {szerkesztheto && (
        <>
          <Section title="Állapot módosítása">
            <AllapotUrlap
              action={hibajegyAllapotAction.bind(null, h.id)}
              lehetosegek={[...HIBAJEGY_ATMENETEK[h.allapot]]}
            />
          </Section>
          <Section title="Felelős kijelölése">
            <FelelosUrlap
              action={hibajegyFelelosAction.bind(null, h.id)}
              felhasznalok={felhasznalok}
              aktualis={h.felelosId}
            />
          </Section>
        </>
      )}

      <Section title="Előzmények">
        <ul className="text-sm">
          {h.elozmenyek.map((e, i) => (
            <li key={i} className="border-t py-1 first:border-t-0">
              {datumIdo(e.idopont)} — {HIBAJEGY_ALLAPOT_LABELS[e.allapot]}
              {e.megjegyzes ? ` (${e.megjegyzes})` : ""}
            </li>
          ))}
        </ul>
      </Section>

      {canWrite && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="hibajegy"
            archived={h.archivalt}
            archiveReason={h.archivalasOka}
            archiveAction={
              h.archivalt ? undefined : archivHibajegyAction.bind(null, h.id)
            }
            restoreAction={
              canDelete ? visszaallitHibajegyAction.bind(null, h.id) : undefined
            }
          />
        </Section>
      )}
    </Container>
  );
}
