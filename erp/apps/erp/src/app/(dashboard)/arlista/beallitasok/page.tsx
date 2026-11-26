import Link from "next/link";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { arlistaApi } from "@erp/arlista";
import { BeallitasokForm } from "./beallitasok-form";

export const dynamic = "force-dynamic";

export default async function BeallitasokPage() {
  await requirePermission("arlista:beallitas:write");
  const beallitasok = await arlistaApi.getBeallitasok();
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div>
        <Link
          href="/arlista/szolgaltatasok"
          className="text-muted-foreground text-sm underline"
        >
          Vissza a szolgáltatás árlistához
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Árképzési beállítások</h1>
        <p className="text-muted-foreground text-sm">
          A szorzó-mátrix minden szolgáltatás árát módosítja. A már kiállított
          dokumentumok ára nem változik (befagyasztott árak).
        </p>
      </div>
      <BeallitasokForm beallitasok={beallitasok} />
    </Container>
  );
}
