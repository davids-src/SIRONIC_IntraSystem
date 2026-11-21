import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { secretsApi } from "@erp/secrets";
import { SECRETS_PERMISSIONS as P } from "@erp/secrets/client";
import { Button, Container, parseDataTableQuery } from "@erp/ui";
import { toSecretViewer } from "@/lib/secrets-viewer";
import { SecretsTable } from "./_components/secrets-table";

export default async function SecretsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePermission(P.read);
  const query = parseDataTableQuery(await searchParams);
  const [{ data, total }, canWrite] = await Promise.all([
    toSecretViewer(user).then((v) => secretsApi.list(v, query)),
    hasPermission(P.write),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Titoktár</h1>
          <p className="text-muted-foreground text-sm">
            Jelszavak és hozzáférések titkosítva. Az érték csak kérésre jelenik meg, és
            minden megjelenítés naplózódik.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/secrets/new">Új titok</Link>
          </Button>
        )}
      </div>
      <SecretsTable data={data} query={query} total={total} />
    </Container>
  );
}
