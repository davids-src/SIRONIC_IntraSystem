import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge } from "@erp/ui";
import {
  KESZLET_PERMISSIONS as P,
  MOZGAS_TIPUS_LABELS,
  MOZGAS_TIPUS_TONES,
  NINCS_HELY_LABEL,
  REFERENCE_TIPUS_LABELS,
  keszletApi,
} from "@erp/keszlet";
import {
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
} from "../../../eszkoz/_components/detail/detail-layout";
import { FoglalasGombok } from "./foglalas-gombok";

export const dynamic = "force-dynamic";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });

export default async function KeszletAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.keszletRead);
  const t = await keszletApi.getKeszlet(
    { userId: user.id, permissions: user.permissions },
    id,
  );
  if (!t) notFound();
  const [canFoglal, canWrite] = await Promise.all([
    hasPermission(P.foglalasWrite),
    hasPermission(P.keszletWrite),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={t.nev}
        subtitle={`${t.kod} · ${t.raktarhelyKod || NINCS_HELY_LABEL}`}
        backHref="/keszlet/lista"
        backLabel="Vissza a készletlistához"
        chips={
          t.minimum !== undefined && t.keszlet <= t.minimum ? (
            <Badge variant="danger">Minimum alatt</Badge>
          ) : undefined
        }
        actions={
          <FoglalasGombok
            id={t._id}
            szabad={t.szabad}
            foglalt={t.foglalt}
            minimum={t.minimum}
            canFoglal={canFoglal}
            canWrite={canWrite}
          />
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Section title="Mennyiségek" mode="readonly">
            <Facts
              items={[
                { label: "Készlet", value: `${FT.format(t.keszlet)} ${t.egyseg}` },
                { label: "Foglalt", value: `${FT.format(t.foglalt)} ${t.egyseg}` },
                { label: "Szabad", value: `${FT.format(t.szabad)} ${t.egyseg}` },
                {
                  label: "Minimum",
                  value: t.minimum ?? undefined,
                  missing: t.minimum === undefined,
                },
                ...(t.ertek !== undefined
                  ? [
                      {
                        label: "Utolsó beszerzési ár",
                        value: `${FT.format(t.utolsoBeszerzesiAr ?? 0)} Ft`,
                      },
                      { label: "Érték", value: `${FT.format(Math.round(t.ertek))} Ft` },
                    ]
                  : []),
              ]}
            />
          </Section>
        </div>
        <div className="lg:col-span-2">
          <Section title="Mozgásnapló" mode="log">
            {t.mozgasok.length === 0 ? (
              <EmptyNote>Még nem volt mozgás.</EmptyNote>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {t.mozgasok.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-2">
                    <Badge variant={MOZGAS_TIPUS_TONES[m.tipus]}>
                      {MOZGAS_TIPUS_LABELS[m.tipus]}
                    </Badge>
                    <span className="font-medium">
                      {m.valtozas !== 0
                        ? `${m.valtozas > 0 ? "+" : ""}${m.valtozas}`
                        : `${m.foglaltValtozas > 0 ? "+" : ""}${m.foglaltValtozas} foglalt`}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {REFERENCE_TIPUS_LABELS[m.referenceType]} · {datum(m.createdAt)}
                      {m.beszerzesiAr !== undefined &&
                        ` · ${FT.format(m.beszerzesiAr)} Ft/db`}
                    </span>
                    {m.jegyzet && <span className="text-xs">{m.jegyzet}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
