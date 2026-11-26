import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { KarbantartasTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function KarbantartasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.karbantartasRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.karbantartasWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await szervizApi.listKarbantartasok(query, { archivaltakkal });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Karbantartási tervek"
        subtitle="Visszatérő karbantartások; az esedékesség megnyitáskor számolódik."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  archivaltakkal
                    ? "/szerviz/karbantartas"
                    : "/szerviz/karbantartas?archivalt=1"
                }
              >
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/szerviz/karbantartas/new">Új terv</Link>
              </Button>
            )}
          </>
        }
      />
      <KarbantartasTabla data={data} query={query} total={total} />
    </Container>
  );
}
