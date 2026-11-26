import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import {
  BIZONYLAT_PERMISSIONS as P,
  SZAMLA_ALLAPOT_LABELS,
  SZAMLA_ATMENETEK,
} from "@erp/bizonylat/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivSzamlaAction,
  kiallitSzamlaAction,
  szamlaAllapotAction,
  szinkronSzamlaAction,
  visszaallitSzamlaAction,
} from "../../actions";
import { AkcioForm } from "../../_components/akcio-form";

const FT = new Intl.NumberFormat("hu-HU");
const nap = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function SzamlaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.szamlaRead);
  const d = await bizonylatApi.getSzamla(id);
  if (!d) notFound();
  const [canWrite, canKiallit, canDelete] = await Promise.all([
    hasPermission(P.szamlaWrite),
    hasPermission(P.szamlaKiallit),
    hasPermission(P.szamlaDelete),
  ]);
  const atmenetek = d.archivalt ? [] : SZAMLA_ATMENETEK[d.tarolt];
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={d.szamlaszam ?? d.azonosito}
        subtitle={d.partnerNev}
        chips={
          <>
            <Badge variant={d.allapot === "lejart" ? "destructive" : "secondary"}>
              {SZAMLA_ALLAPOT_LABELS[d.allapot]}
            </Badge>
            {d.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
      />
      <Section title="Adatok">
        <Facts
          items={[
            { label: "Belső azonosító", value: d.azonosito },
            { label: "Billingo hivatkozás", value: d.billingoRef },
            { label: "Kiállítva", value: nap(d.kiallitva) },
            { label: "Esedékes", value: nap(d.esedekes) },
            { label: "Kifizetve", value: nap(d.kifizetve) },
            { label: "Adószám", value: d.partnerAdoszam },
            { label: "Igazolás", value: d.igazolasId },
          ]}
        />
      </Section>
      <Section title="Tételek">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-1">Megnevezés</th>
                <th className="p-1 text-right">Menny.</th>
                <th className="p-1 text-right">Nettó egységár</th>
                <th className="p-1 text-right">ÁFA</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm">
          <strong>
            Bruttó: {FT.format(d.osszeg)} {d.penznem}
          </strong>
        </p>
      </Section>
      {!d.archivalt && (
        <Section title="Műveletek">
          <div className="flex flex-col gap-3">
            {d.tarolt === "piszkozat" && canKiallit && (
              <AkcioForm
                action={kiallitSzamlaAction.bind(null, d.id)}
                label="Kiállítás a Billingóban"
                kiemelt
                megerosites="Kiállítod a számlát a Billingóban? Ez nem vonható vissza."
              />
            )}
            {d.billingoRef && d.tarolt === "elkuldve" && canWrite && (
              <AkcioForm
                action={szinkronSzamlaAction.bind(null, d.id)}
                label="Állapot lekérdezése a Billingóból"
              />
            )}
            {atmenetek.includes("kifizetve") && canWrite && (
              <AkcioForm
                action={szamlaAllapotAction.bind(null, d.id)}
                hidden={{ allapot: "kifizetve" }}
                label="Kifizetve (kézi jelölés)"
                mezo={{ name: "megjegyzes", placeholder: "Megjegyzés (opcionális)" }}
              />
            )}
            {atmenetek.includes("sztorno") && canDelete && (
              <AkcioForm
                action={szamlaAllapotAction.bind(null, d.id)}
                hidden={{ allapot: "sztorno" }}
                label="Sztornó"
                veszelyes
                mezo={{ name: "megjegyzes", placeholder: "Megjegyzés (opcionális)" }}
                megerosites="Sztornózod a számlát a rendszerben? A Billingóban külön kell sztornózni."
              />
            )}
          </div>
        </Section>
      )}
      {canDelete && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="számla"
            archived={d.archivalt}
            archiveReason={d.archivalasOka}
            archiveAction={archivSzamlaAction.bind(null, d.id)}
            restoreAction={visszaallitSzamlaAction.bind(null, d.id)}
          />
        </Section>
      )}
    </Container>
  );
}
