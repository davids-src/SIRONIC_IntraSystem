import Link from "next/link";
import { CheckCircle2Icon, PackageIcon, SearchXIcon, WrenchIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { eszkozApi } from "@erp/eszkoz";
import { KpiTile } from "@/components/kpi-tile";
import { EszkozokTable } from "./_components/eszkozok-table";

export default async function EszkozokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("eszkoz:eszkoz:read");
  const canManage = await hasPermission("eszkoz:eszkoz:write");
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, osszegzes] = await Promise.all([
    eszkozApi.listEszkozok(query),
    eszkozApi.getOsszegzes(),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Eszközök</h1>
          <p className="text-muted-foreground text-sm">
            Szerszámok és eszközök nyilvántartása: ki, mikor, milyen állapotban vitte el.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/eszkoz/new">Új eszköz felvétele</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Összes eszköz"
          hint="kivonás nélkül"
          value={osszegzes.osszes}
          icon={<PackageIcon className="size-5" />}
        />
        <KpiTile
          label="Kiadva"
          value={osszegzes.kiadva}
          tone="info"
          icon={<CheckCircle2Icon className="size-5" />}
        />
        <KpiTile
          label="Szervizben"
          value={osszegzes.szervizben}
          tone={osszegzes.szervizben > 0 ? "warning" : "success"}
          icon={<WrenchIcon className="size-5" />}
        />
        <KpiTile
          label="Elveszett"
          value={osszegzes.elveszett}
          tone={osszegzes.elveszett > 0 ? "danger" : "success"}
          icon={<SearchXIcon className="size-5" />}
        />
      </div>

      <EszkozokTable data={data} query={query} total={total} />
    </Container>
  );
}
