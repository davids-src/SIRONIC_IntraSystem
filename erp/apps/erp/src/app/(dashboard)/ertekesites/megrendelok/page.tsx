import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { MegrendeloTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function MegrendelokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.megrendeloRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.megrendeloWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await ertekesitesApi.listMegrendelok(query, { archivaltakkal });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Megrendelőlapok"
        subtitle="Beszállítói megrendelések."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/ertekesites/megrendelok"
                    : "/ertekesites/megrendelok?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/ertekesites/megrendelok/new">Új megrendelőlap</Link>
              </Button>
            )}
          </>
        }
      />
      <MegrendeloTabla data={data} query={query} total={total} />
    </Container>
  );
}
