import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { JotallasTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function JotallasokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.jotallasRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.jotallasWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await bizonylatApi.listJotallasok(query, { archivaltakkal });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Jótállási jegyek"
        actions={
          <>
            {canWrite && (
              <Button asChild variant="outline">
                <Link href="/bizonylat/beallitasok">Jogi szöveg</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/bizonylat/jotallasok"
                    : "/bizonylat/jotallasok?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/bizonylat/jotallasok/new">Új jótállási jegy</Link>
              </Button>
            )}
          </>
        }
      />
      <JotallasTabla data={data} query={query} total={total} />
    </Container>
  );
}
