import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container } from "@erp/ui";
import { infraApi } from "@erp/infra";
import { SablonokTabla } from "../_components/tablak";

export default async function SablonokPage() {
  await requirePermission("infra:sablon:read");
  const [irhat, sablonok] = await Promise.all([
    hasPermission("infra:sablon:write"),
    infraApi.listSablonok(),
  ]);
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stack sablonok</h1>
          <p className="text-muted-foreground text-sm">
            Újrahasznosítható compose fájlok alapértelmezett környezeti változókkal. Az
            „Új stack” űrlapon kiválasztva előtöltik a mezőket.
          </p>
        </div>
        {irhat && (
          <Button asChild>
            <Link href="/infra/sablonok/new">Új sablon</Link>
          </Button>
        )}
      </div>
      <SablonokTabla
        rows={sablonok.map((s) => ({
          id: s.id,
          nev: s.nev,
          leiras: s.leiras ?? "",
          tipus: s.tipus,
          szolgaltatasok: s.szolgaltatasok,
        }))}
      />
    </Container>
  );
}
