import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge, Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import {
  BIZONYLAT_PERMISSIONS as P,
  JOTALLAS_ALLAPOT_LABELS,
  JOTALLAS_ATMENETEK,
  jotallasiJegyHtml,
} from "@erp/bizonylat/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivJotallasAction,
  jotallasAllapotAction,
  visszaallitJotallasAction,
} from "../../actions";
import { AkcioForm } from "../../_components/akcio-form";
import { PdfGomb } from "../../_components/pdf-gomb";

const nap = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function JotallasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.jotallasRead);
  const d = await bizonylatApi.getJotallas(id);
  if (!d) notFound();
  const [canWrite, canDelete] = await Promise.all([
    hasPermission(P.jotallasWrite),
    hasPermission(P.jotallasDelete),
  ]);
  const atmenetek = d.archivalt ? [] : JOTALLAS_ATMENETEK[d.tarolt];
  const html = jotallasiJegyHtml(d, { nev: "SIRONIC" });
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={d.azonosito}
        subtitle={d.partnerNev}
        chips={
          <>
            <Badge variant="secondary">{JOTALLAS_ALLAPOT_LABELS[d.allapot]}</Badge>
            {d.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
        actions={<PdfGomb html={html} fajlNev={`${d.azonosito}.pdf`} />}
      />
      <Section title="Adatok">
        <Facts
          items={[
            { label: "Kiállítva", value: d.kiallitasNap },
            { label: "Számlaszám", value: d.szamlaszam },
            { label: "Lejárat", value: nap(d.lejarat) },
          ]}
        />
        {d.megjegyzes && <p className="text-sm whitespace-pre-line">{d.megjegyzes}</p>}
      </Section>
      <Section title="Tételek">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="p-1">Termék</th>
              <th className="p-1">Gyári szám</th>
              <th className="p-1">Idő</th>
              <th className="p-1">Kezdete</th>
              <th className="p-1">Vége</th>
            </tr>
          </thead>
          <tbody>
            {d.sorok.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="p-1">{s.termekNev}</td>
                <td className="p-1">{s.gyariSzam}</td>
                <td className="p-1">{s.evek} év</td>
                <td className="p-1">{nap(s.kezdet)}</td>
                <td className="p-1">{nap(s.vege)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Jogi szöveg (a kiállításkor rögzítve)">
        <p className="text-sm whitespace-pre-line">{d.jogiSzoveg}</p>
      </Section>
      {canWrite && atmenetek.length > 0 && (
        <Section title="Állapot módosítása">
          <div className="flex flex-col gap-3">
            {atmenetek.map((a) => (
              <AkcioForm
                key={a}
                action={jotallasAllapotAction.bind(null, d.id)}
                hidden={{ allapot: a }}
                label={`${JOTALLAS_ALLAPOT_LABELS[a]} állapotba`}
                mezo={{ name: "megjegyzes", placeholder: "Megjegyzés (opcionális)" }}
              />
            ))}
          </div>
        </Section>
      )}
      {canDelete && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="jótállási jegy"
            archived={d.archivalt}
            archiveReason={d.archivalasOka}
            archiveAction={archivJotallasAction.bind(null, d.id)}
            restoreAction={visszaallitJotallasAction.bind(null, d.id)}
          />
        </Section>
      )}
    </Container>
  );
}
