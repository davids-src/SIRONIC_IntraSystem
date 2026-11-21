import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { PageHeader } from "../_components/form-ui";
import { ErdeklodoTable } from "./_components/erdeklodo-table";

export default async function ErdeklodokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PARTNER_PERMISSIONS.erdeklodoRead);
  const params = await searchParams;
  const canWrite = await hasPermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await partnerApi.listErdeklodok(query, { archivaltakkal });

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Érdeklődők"
        subtitle="Még nem partner cégek és személyek az értékesítési folyamatban."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/partner/erdeklodok"
                    : "/partner/erdeklodok?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/partner/erdeklodok/new">Új érdeklődő</Link>
              </Button>
            )}
          </>
        }
      />
      <ErdeklodoTable data={data} query={query} total={total} />
    </Container>
  );
}
