import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { SzallitolevelTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function SzallitolevelekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.szallitolevelRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.szallitolevelWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await bizonylatApi.listSzallitolevelek(query, {
    archivaltakkal,
  });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Szállítólevelek"
        subtitle="Kiadás a készletből."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/bizonylat/szallitolevelek"
                    : "/bizonylat/szallitolevelek?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/bizonylat/szallitolevelek/new">Új szállítólevél</Link>
              </Button>
            )}
          </>
        }
      />
      <SzallitolevelTabla data={data} query={query} total={total} />
    </Container>
  );
}
