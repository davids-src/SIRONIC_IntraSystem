import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge } from "@erp/ui";
import {
  KESZLET_PERMISSIONS as P,
  LELTAR_ALLAPOT_LABELS,
  LELTAR_ALLAPOT_TONES,
  NINCS_HELY_LABEL,
  keszletApi,
} from "@erp/keszlet";
import { DetailHeader } from "../../../eszkoz/_components/detail/detail-layout";
import { LeltarSzerkeszto } from "./leltar-szerkeszto";

export const dynamic = "force-dynamic";

export default async function LeltarAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.keszletRead);
  const l = await keszletApi.getLeltar(id);
  if (!l) notFound();
  const canWrite = await hasPermission(P.leltarWrite);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={`Leltár ${l.sorszam}`}
        subtitle={l.raktarhelyKod || NINCS_HELY_LABEL}
        backHref="/keszlet/leltar"
        backLabel="Vissza a leltárakhoz"
        chips={
          <Badge variant={LELTAR_ALLAPOT_TONES[l.allapot]}>
            {LELTAR_ALLAPOT_LABELS[l.allapot]}
          </Badge>
        }
      />
      <LeltarSzerkeszto leltar={l} szerkesztheto={canWrite && l.allapot !== "lezarva"} />
    </div>
  );
}
