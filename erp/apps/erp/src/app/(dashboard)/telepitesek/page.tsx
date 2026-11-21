import Link from "next/link";
import { AlertTriangleIcon, CheckCircle2Icon, CloudIcon, HammerIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { deploymentsApi } from "@erp/deployments";
import { KpiTile } from "@/components/kpi-tile";
import { TelepitesekTable } from "./_components/tablak";

export default async function TelepitesekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("deployments:telepites:read");
  const canWrite = await hasPermission("deployments:telepites:write");
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, os] = await Promise.all([
    deploymentsApi.listTelepitesek(query),
    deploymentsApi.getOsszegzes(),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Telepítések</h1>
          <p className="text-muted-foreground text-sm">
            Partneroldalak kiépítése lépésenként: Cloudflare, NPM, GitHub és Portainer.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/telepitesek/new">Új telepítés</Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Összes"
          value={os.osszes}
          icon={<CloudIcon className="size-5" />}
        />
        <KpiTile
          label="Él"
          value={os.elo}
          tone="success"
          icon={<CheckCircle2Icon className="size-5" />}
        />
        <KpiTile
          label="Kiépítés alatt"
          value={os.kiepites}
          tone="info"
          icon={<HammerIcon className="size-5" />}
        />
        <KpiTile
          label="Beavatkozást igényel"
          hint="hibás vagy kézi lépés"
          value={os.akadalyosLepes}
          tone={os.akadalyosLepes > 0 ? "danger" : "success"}
          icon={<AlertTriangleIcon className="size-5" />}
        />
      </div>
      <TelepitesekTable data={data} query={query} total={total} />
    </Container>
  );
}
