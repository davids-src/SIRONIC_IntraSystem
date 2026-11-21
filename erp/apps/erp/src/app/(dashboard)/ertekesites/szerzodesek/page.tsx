import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { SzerzodesTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function SzerzodesekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.szerzodesRead);
  const params = await searchParams;
  const canWrite = await hasPermission(P.szerzodesWrite);
  const query = parseDataTableQuery(params);
  const torolttel = params.torolt === "1";
  const { data, total } = await ertekesitesApi.listSzerzodesek(query, { torolttel });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Szerződések"
        subtitle="Sablonból generált és feltöltött szerződések."
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href={
                  torolttel
                    ? "/ertekesites/szerzodesek"
                    : "/ertekesites/szerzodesek?torolt=1"
                }
              >
                {torolttel ? "Töröltek elrejtése" : "Töröltek mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <>
                <Button asChild variant="outline">
                  <Link href="/ertekesites/szerzodesek/sablonok">Sablonok</Link>
                </Button>
                <Button asChild>
                  <Link href="/ertekesites/szerzodesek/new">Új szerződés</Link>
                </Button>
              </>
            )}
          </>
        }
      />
      <SzerzodesTabla data={data} query={query} total={total} />
    </Container>
  );
}
