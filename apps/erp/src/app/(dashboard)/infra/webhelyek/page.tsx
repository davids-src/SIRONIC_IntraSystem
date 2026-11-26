import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { Button, Container } from "@erp/ui";
import { WEBHELY_TIPUS_LABELS } from "@erp/infra/client";
import { infraApi } from "@erp/infra";
import { WebhelyekTabla } from "../_components/tablak";

export default async function WebhelyekPage() {
  await requirePermission("infra:webhely:read");
  const [irhat, partnerek] = await Promise.all([
    hasPermission("infra:webhely:write"),
    partnerApi.listPartnerOptions(),
  ]);
  const nevek = new Map(partnerek.map((p) => [p.id, p.nev]));
  const lista = await infraApi.listWebhelyek({ partnerNevek: nevek });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Webhelyek</h1>
          <p className="text-muted-foreground text-sm">
            Az olyan oldalak nyilvántartása, amelyek nem a saját Portaineren futnak:
            WordPress és FTP-s webtárhelyek, partnerhez rendelve, a belépéseikkel együtt.
          </p>
        </div>
        {irhat && (
          <Button asChild>
            <Link href="/infra/webhelyek/new">Új webhely</Link>
          </Button>
        )}
      </div>
      <WebhelyekTabla
        rows={lista.map((w) => ({
          id: w.id,
          nev: w.nev,
          tipus: w.tipus,
          hostnev: w.hostnevek[0] ?? "",
          partner: w.partnerNev ?? "",
          tarhely: w.tarhely ?? "",
          lejarat: w.lejarat ? new Date(w.lejarat).toLocaleDateString("hu-HU") : "",
          allapot: w.utolsoEllenorzes ? (w.utolsoEllenorzes.ok ? "ok" : "hiba") : "nincs",
          hozzaferesek: w.hozzaferesSzam,
        }))}
      />
      <p className="text-muted-foreground text-xs">
        Típusok: {Object.values(WEBHELY_TIPUS_LABELS).join(", ")}.
      </p>
    </Container>
  );
}
