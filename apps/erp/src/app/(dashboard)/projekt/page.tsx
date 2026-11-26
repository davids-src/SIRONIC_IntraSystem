import Link from "next/link";
import {
  AlarmClockIcon,
  CheckCircle2Icon,
  FolderOpenIcon,
  PauseCircleIcon,
} from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { KpiTile } from "@/components/kpi-tile";
import { ProjektekTable } from "./_components/projektek-table";

export default async function ProjektekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.projektRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.projektWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const nezo = { kind: "staff", userId: user.id } as const;
  const [{ data, total }, osszegzes] = await Promise.all([
    projektApi.listProjektek(query, nezo, { archivaltakkal }),
    projektApi.getOsszegzes(),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projektek</h1>
          <p className="text-muted-foreground text-sm">
            Fázisok, ellenőrzőlista, staging linkek és költségek projektenként.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={archivaltakkal ? "/projekt" : "/projekt?archivalt=1"}>
              {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
            </Link>
          </Button>
          {canWrite && (
            <Button asChild>
              <Link href="/projekt/new">Új projekt</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Nyitott"
          value={osszegzes.nyitott}
          tone="info"
          icon={<FolderOpenIcon className="size-5" />}
        />
        <KpiTile
          label="Felfüggesztett"
          value={osszegzes.felfuggesztett}
          tone={osszegzes.felfuggesztett > 0 ? "warning" : "success"}
          icon={<PauseCircleIcon className="size-5" />}
        />
        <KpiTile
          label="Lezárt"
          value={osszegzes.lezart}
          tone="success"
          icon={<CheckCircle2Icon className="size-5" />}
        />
        <KpiTile
          label="Lejárt határidejű"
          hint="nyitott projektek"
          value={osszegzes.keso}
          tone={osszegzes.keso > 0 ? "danger" : "success"}
          icon={<AlarmClockIcon className="size-5" />}
        />
      </div>

      <ProjektekTable data={data} query={query} total={total} />
    </Container>
  );
}
