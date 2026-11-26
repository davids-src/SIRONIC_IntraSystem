import Link from "next/link";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { arlistaApi } from "@erp/arlista";
import { SzolgaltatasForm } from "../_components/szolgaltatas-form";

export const dynamic = "force-dynamic";

export default async function UjSzolgaltatasPage() {
  await requirePermission("arlista:szolgaltatas:write");
  const kategoriak = (await arlistaApi.listKategoriak()).filter((k) => k.aktiv);
  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div>
        <Link
          href="/arlista/szolgaltatasok"
          className="text-muted-foreground text-sm underline"
        >
          Vissza a szolgáltatás árlistához
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Új szolgáltatás</h1>
      </div>
      {kategoriak.length === 0 ? (
        <p className="text-sm">
          Előbb hozz létre egy kategóriát a{" "}
          <Link href="/arlista/szolgaltatasok/kategoriak" className="underline">
            Kategóriák
          </Link>{" "}
          oldalon.
        </p>
      ) : (
        <SzolgaltatasForm kategoriak={kategoriak} />
      )}
    </Container>
  );
}
