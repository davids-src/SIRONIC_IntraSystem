import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import {
  ERTEKESITES_PERMISSIONS as P,
  MEGRENDELO_ALLAPOT_LABELS,
  MEGRENDELO_ATMENETEK,
} from "@erp/ertekesites/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivMegrendeloAction,
  megrendeloAllapotAction,
  ujraBevetelezMegrendeloAction,
  visszaallitMegrendeloAction,
} from "../../actions";
import { AkcioGomb } from "@/app/(dashboard)/szerviz/_components/akcio-gomb";
import { AllapotPanel, type AllapotLehetoseg } from "../../_components/allapot-panel";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function MegrendeloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.megrendeloRead);
  const m = await ertekesitesApi.getMegrendelo(id);
  if (!m) notFound();
  const [canWrite, canDelete] = await Promise.all([
    hasPermission(P.megrendeloWrite),
    hasPermission(P.megrendeloDelete),
  ]);
  const lehetosegek: AllapotLehetoseg[] = m.archivalt
    ? []
    : MEGRENDELO_ATMENETEK[m.allapot]
        .filter((n) => (n === "torolt" ? canDelete : canWrite))
        .map((n) => ({
          allapot: n,
          label:
            n === "teljesitve"
              ? "Teljesítve"
              : `${MEGRENDELO_ALLAPOT_LABELS[n]} állapotba`,
          kiemelt: n === "elkuldve" || n === "teljesitve",
        }));

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={m.azonosito}
        subtitle={m.beszallitoNev}
        chips={
          <>
            <Badge variant="secondary">{MEGRENDELO_ALLAPOT_LABELS[m.allapot]}</Badge>
            {m.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
        actions={
          canWrite && m.allapot === "piszkozat" && !m.archivalt ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/ertekesites/megrendelok/${m.id}/edit`}>
                <PencilIcon className="mr-1 size-4" />
                Szerkesztés
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Section title="Adatok">
        <Facts
          items={[
            { label: "Várható szállítás", value: datum(m.varhatoSzallitas) },
            { label: "Projekt", value: m.projektId },
            { label: "Ajánlat", value: m.ajanlatId },
            {
              label: "Bevételezés",
              value: m.bevetelezes
                ? `${m.bevetelezes.ok ? "Sikeres" : "Sikertelen"}${m.bevetelezes.uzenet ? ` — ${m.bevetelezes.uzenet}` : ""}`
                : undefined,
            },
          ]}
        />
        {m.megjegyzes && <p className="text-sm whitespace-pre-line">{m.megjegyzes}</p>}
        {m.allapot === "teljesitve" && m.bevetelezes && !m.bevetelezes.ok && canWrite && (
          <div className="flex flex-wrap items-center gap-3 rounded border border-red-300 p-2 text-sm">
            A bevételezés nem sikerült — az áru még nincs a készletben.
            <AkcioGomb
              action={ujraBevetelezMegrendeloAction.bind(null, m.id)}
              label="Bevételezés újrapróbálása"
            />
          </div>
        )}
      </Section>
      <Section title="Tételek">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-1">Megnevezés</th>
                <th className="p-1 text-right">Menny.</th>
                <th className="p-1 text-right">Nettó egységár</th>
                <th className="p-1 text-right">ÁFA</th>
              </tr>
            </thead>
            <tbody>
              {m.sorok.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{s.leiras}</td>
                  <td className="p-1 text-right">
                    {FT.format(s.mennyiseg)} {s.egyseg}
                  </td>
                  <td className="p-1 text-right">{FT.format(s.nettoEgysegar)}</td>
                  <td className="p-1 text-right">{s.afaKulcs}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm">
          Nettó: {FT.format(m.nettoOsszeg)} · ÁFA: {FT.format(m.afaOsszeg)} ·{" "}
          <strong>
            Bruttó: {FT.format(m.bruttoOsszeg)} {m.penznem}
          </strong>
        </p>
      </Section>
      {lehetosegek.length > 0 && (
        <Section title="Állapot módosítása">
          <AllapotPanel
            action={megrendeloAllapotAction.bind(null, m.id)}
            lehetosegek={lehetosegek}
          />
        </Section>
      )}
      {canDelete && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="megrendelőlap"
            archived={m.archivalt}
            archiveReason={m.archivalasOka}
            archiveAction={archivMegrendeloAction.bind(null, m.id)}
            restoreAction={visszaallitMegrendeloAction.bind(null, m.id)}
          />
        </Section>
      )}
    </Container>
  );
}
