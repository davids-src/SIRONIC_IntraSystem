import { requirePermission } from "@erp/auth";
import Link from "next/link";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { SzamlaTabla } from "../_components/lista-tablak";

export const dynamic = "force-dynamic";

export default async function SzamlakPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(P.szamlaRead);
  const params = await searchParams;
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await bizonylatApi.listSzamlak(query, { archivaltakkal });
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Számlák"
        subtitle="A számlák a Billingóban készülnek; itt az állapotuk látszik. Piszkozat elfogadott teljesítésigazolásból készíthető."
        actions={
          <Button asChild variant="outline">
            <Link
              href={
                archivaltakkal ? "/bizonylat/szamlak" : "/bizonylat/szamlak?archivalt=1"
              }
            >
              {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
            </Link>
          </Button>
        }
      />
      <SzamlaTabla data={data} query={query} total={total} />
    </Container>
  );
}
