import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { PageHeader } from "./_components/form-ui";
import { PartnerTable } from "./_components/partner-table";

export default async function PartnerekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PARTNER_PERMISSIONS.partnerRead);
  const params = await searchParams;
  const canWrite = await hasPermission(PARTNER_PERMISSIONS.partnerWrite);
  const archivaltakkal = params.archivalt === "1";
  const query = parseDataTableQuery(params);
  const { data, total } = await partnerApi.listPartnerek(query, { archivaltakkal });

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Partnerek"
        subtitle="Ügyfelek, alvállalkozók és beszállítók egy helyen."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={archivaltakkal ? "/partner" : "/partner?archivalt=1"}>
                {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href="/partner/new">Új partner</Link>
              </Button>
            )}
          </>
        }
      />
      <PartnerTable data={data} query={query} total={total} />
    </Container>
  );
}
