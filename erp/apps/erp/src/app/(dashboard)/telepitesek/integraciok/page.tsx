import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { INTEGRACIO_LABELS, INTEGRACIO_SZOLGALTATOK, deploymentsApi } from "@erp/deployments";
import { IntegracioTesztek } from "../_components/integracio-teszt";
import { IntegraciokTable } from "../_components/tablak";

export default async function IntegraciokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("deployments:integracio:read");
  const canWrite = await hasPermission("deployments:integracio:write");
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, mind] = await Promise.all([
    deploymentsApi.listIntegraciok(query),
    deploymentsApi.listIntegraciok({ page: 1, pageSize: 100, filters: {} }),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Integrációk</h1>
          <p className="text-muted-foreground text-sm">
            Cloudflare, NPM, Portainer és GitHub kapcsolatok. A hitelesítő adatok titkosítva
            tárolódnak, és a felületen soha nem jelennek meg.
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {INTEGRACIO_SZOLGALTATOK.map((s) => (
              <Button key={s} asChild variant="outline" size="sm">
                <Link href={`/telepitesek/integraciok/new?szolgaltato=${s}`}>
                  + {INTEGRACIO_LABELS[s]}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>
      <IntegracioTesztek
        tesztelhet={canWrite}
        kapcsolatok={mind.data.map((k) => ({
          id: k._id,
          szolgaltato: k.szolgaltato as never,
          cimke: k.cimke,
          aktiv: k.aktiv,
          utolsoEllenorzes: k.utolsoEllenorzes,
          utolsoEllenorzesOk: k.utolsoEllenorzesOk,
          utolsoEllenorzesUzenet: k.utolsoEllenorzesUzenet,
        }))}
      />
      <IntegraciokTable data={data} query={query} total={total} szerkesztheto={canWrite} />
    </Container>
  );
}
