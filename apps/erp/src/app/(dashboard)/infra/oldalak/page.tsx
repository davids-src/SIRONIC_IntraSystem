import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { Button, Container } from "@erp/ui";
import { OldalakTabla } from "../_components/tablak";
import { infraApi } from "@erp/infra";

export default async function OldalakPage() {
  await requirePermission("infra:oldal:read");
  const [irhat, partnerek] = await Promise.all([
    hasPermission("infra:oldal:write"),
    partnerApi.listPartnerOptions(),
  ]);
  const nevek = new Map(partnerek.map((p) => [p.id, p.nev]));
  const oldalak = await infraApi.listOldalak({}, { partnerNevek: nevek });

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Oldalak</h1>
          <p className="text-muted-foreground text-sm">
            Egy oldal egy domain (és aliasai), amely egy stack egy szolgáltatására mutat —
            DNS (Cloudflare), SSL és proxy (NPM) egyben kezelve.
          </p>
        </div>
        {irhat && (
          <Button asChild>
            <Link href="/infra/oldalak/new">Új oldal</Link>
          </Button>
        )}
      </div>

      <OldalakTabla
        rows={oldalak.map((o) => ({
          id: o.id,
          hostnev: o.hostnevek[0] ?? o.nev,
          aliasok: o.hostnevek.slice(1).join(", "),
          stack: o.stackNev ?? "külső cél",
          cel: `${o.szolgaltatas}:${o.port}`,
          partner: o.partnerNev ?? "",
        }))}
      />
    </Container>
  );
}
