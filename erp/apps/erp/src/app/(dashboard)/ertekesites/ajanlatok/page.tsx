import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { AjanlatTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function AjanlatokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.ajanlatRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.ajanlatWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await ertekesitesApi.listAjanlatok(query, { archivaltakkal });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Ajánlatok"
        subtitle="Árajánlatok a piszkozattól az elfogadásig."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/ertekesites/ajanlatok"
                    : "/ertekesites/ajanlatok?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/ertekesites/ajanlatok/new">Új ajánlat</Link>
              </Button>
            )}
          </>
        }
      />
      <AjanlatTabla data={data} query={query} total={total} />
    </Container>
  );
}
