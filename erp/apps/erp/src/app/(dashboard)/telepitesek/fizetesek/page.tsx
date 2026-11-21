import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { Container, parseDataTableQuery } from "@erp/ui";
import { deploymentsApi } from "@erp/deployments";
import { KpiTile } from "@/components/kpi-tile";
import {
  FizetesekTable,
  IdoszakGeneralGomb,
  NyitottFizetesek,
} from "../_components/fizetesek-kliens";

export default async function FizetesekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("deployments:fizetes:read");
  const [irhat, elengedhet] = await Promise.all([
    hasPermission("deployments:fizetes:write"),
    hasPermission("deployments:fizetes:delete"),
  ]);
  const query = parseDataTableQuery(await searchParams);
  const [os, tabla, nyitott] = await Promise.all([
    deploymentsApi.osszegzes(),
    deploymentsApi.listFizetesek(query),
    // The action list: open payments only, overdue (oldest period end) first.
    Promise.all([
      deploymentsApi.listFizetesek({
        page: 1,
        pageSize: 50,
        filters: { allapot: "keso" },
      }),
      deploymentsApi.listFizetesek({
        page: 1,
        pageSize: 50,
        filters: { allapot: "esedekes" },
      }),
    ]).then(([k, e]) => [...k.data, ...e.data].slice(0, 50)),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fizetések</h1>
          <p className="text-muted-foreground text-sm">
            Számlázási időszakok; a késedelem a időszak végéből számolódik, nem külön
            tárolt állapot.
          </p>
        </div>
        {irhat && <IdoszakGeneralGomb />}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Esedékes"
          value={os.esedekes}
          tone="info"
          icon={<ClockIcon className="size-5" />}
        />
        <KpiTile
          label="Késedelmes"
          value={os.keso}
          tone={os.keso > 0 ? "danger" : "success"}
          icon={<AlertTriangleIcon className="size-5" />}
        />
        <KpiTile
          label="Késedelmes összeg"
          hint="Ft"
          value={os.kesoOsszegHuf.toLocaleString("hu-HU")}
          tone={os.kesoOsszegHuf > 0 ? "danger" : "success"}
          icon={<BanknoteIcon className="size-5" />}
        />
        <KpiTile
          label="Fizetve ebben a hónapban"
          value={os.fizetveEzenAHonapon}
          tone="success"
          icon={<CheckCircle2Icon className="size-5" />}
        />
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Nyitott díjak</h2>
        <NyitottFizetesek sorok={nyitott} irhat={irhat} elengedhet={elengedhet} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Minden időszak</h2>
        <FizetesekTable data={tabla.data} query={query} total={tabla.total} />
      </section>
    </Container>
  );
}
