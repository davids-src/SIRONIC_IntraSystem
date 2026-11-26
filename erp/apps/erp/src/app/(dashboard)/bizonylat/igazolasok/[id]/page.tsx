import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import {
  BIZONYLAT_PERMISSIONS as P,
  IGAZOLAS_ALLAPOT_LABELS,
} from "@erp/bizonylat/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivIgazolasAction,
  kuldIgazolasAction,
  szamlaIgazolasbolAction,
  visszaallitIgazolasAction,
} from "../../actions";
import { AkcioForm } from "../../_components/akcio-form";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso?: string) => (iso ? new Date(iso).toLocaleString("hu-HU") : undefined);
const nap = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function IgazolasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.igazolasRead);
  const canWrite = await hasPermission(P.igazolasWrite);
  const d = await bizonylatApi.getIgazolas(id, {
    kind: "staff",
    userId: user.id,
    belsoLathato: canWrite,
  });
  if (!d) notFound();
  const [canKuld, canDelete, canSzamla] = await Promise.all([
    hasPermission(P.igazolasKuld),
    hasPermission(P.igazolasDelete),
    hasPermission(P.szamlaWrite),
  ]);
  const nyitott = d.allapot === "piszkozat" || d.allapot === "elkuldve";

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={d.azonosito}
        subtitle={`${d.cim} · ${d.partnerNev}`}
        chips={
          <>
            <Badge variant="secondary">{IGAZOLAS_ALLAPOT_LABELS[d.allapot]}</Badge>
            {d.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
        actions={
          canWrite && d.allapot === "piszkozat" && !d.archivalt ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/bizonylat/igazolasok/${d.id}/edit`}>
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
            { label: "Címzett e-mail", value: d.partnerEmail },
            { label: "Munka kezdete", value: nap(d.idoszakKezdet) },
            { label: "Munka vége", value: nap(d.idoszakVege) },
            { label: "Munkaóra", value: d.osszOra },
            { label: "Elküldve", value: datum(d.kuldveAt) },
            { label: "Aláíró hivatkozás érvényes", value: datum(d.tokenLejar) },
            { label: "Projekt", value: d.projektId },
            { label: "Ajánlat", value: d.ajanlatId },
          ]}
        />
        <p className="text-sm whitespace-pre-line">{d.munkaOsszegzes}</p>
        {d.belsoMegjegyzes && (
          <p className="rounded-md border border-dashed p-2 text-sm whitespace-pre-line">
            <span className="text-muted-foreground block text-xs">
              Belső megjegyzés (az ügyfél nem látja)
            </span>
            {d.belsoMegjegyzes}
          </p>
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
                {canWrite && <th className="p-1 text-right">Beszerzési ár</th>}
              </tr>
            </thead>
            <tbody>
              {d.sorok.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{s.leiras}</td>
                  <td className="p-1 text-right">
                    {FT.format(s.mennyiseg)} {s.egyseg}
                  </td>
                  <td className="p-1 text-right">{FT.format(s.nettoEgysegar)}</td>
                  <td className="p-1 text-right">{s.afaKulcs}%</td>
                  {canWrite && (
                    <td className="p-1 text-right">
                      {s.beszerzesiEgysegar !== undefined
                        ? FT.format(s.beszerzesiEgysegar)
                        : ""}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm">
          Nettó: {FT.format(d.osszegek.nettoOsszeg)} · ÁFA:{" "}
          {FT.format(d.osszegek.afaOsszeg)} ·{" "}
          <strong>
            Bruttó: {FT.format(d.osszegek.bruttoOsszeg)} {d.penznem}
          </strong>
        </p>
      </Section>
      {d.alairas && (
        <Section title="Ügyfél aláírása">
          <Facts
            items={[
              { label: "Aláíró", value: d.alairas.nev },
              { label: "Beosztás", value: d.alairas.beosztas },
              { label: "Aláírás ideje", value: datum(d.alairas.alairtAt) },
            ]}
          />
          <img
            src={d.alairas.kep}
            alt="Az ügyfél aláírása"
            className="max-h-40 rounded-md border bg-white p-2"
          />
        </Section>
      )}
      {d.allapot === "elutasitva" && (
        <Section title="Elutasítás">
          <p className="text-sm whitespace-pre-line">{d.elutasitasOka}</p>
        </Section>
      )}
      {!d.archivalt && (
        <Section title="Műveletek">
          <div className="flex flex-col gap-3">
            {nyitott && canKuld && (
              <AkcioForm
                action={kuldIgazolasAction.bind(null, d.id)}
                label={
                  d.allapot === "piszkozat"
                    ? "Küldés az ügyfélnek"
                    : "Újraküldés (új hivatkozással)"
                }
                kiemelt
                megerosites="Kiküldöd az aláíró hivatkozást az ügyfélnek?"
              />
            )}
            {d.allapot === "elfogadva" && canSzamla && (
              <AkcioForm
                action={szamlaIgazolasbolAction.bind(null, d.id)}
                label="Számla piszkozat készítése"
              />
            )}
            {d.allapot === "elkuldve" && (
              <p className="text-muted-foreground text-sm">
                Az igazolás az ügyfél aláírására vár; elfogadás vagy elutasítás után nem
                módosítható.
              </p>
            )}
          </div>
        </Section>
      )}
      {canDelete && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="igazolás"
            archived={d.archivalt}
            archiveReason={d.archivalasOka}
            archiveAction={archivIgazolasAction.bind(null, d.id)}
            restoreAction={visszaallitIgazolasAction.bind(null, d.id)}
          />
        </Section>
      )}
    </Container>
  );
}
