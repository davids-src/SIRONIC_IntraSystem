import Link from "next/link";
import { requirePermission } from "@erp/auth";
import { Badge, Button, Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";

export const dynamic = "force-dynamic";

export default async function SablonokPage() {
  await requirePermission(P.szerzodesWrite);
  const sablonok = await ertekesitesApi.listSablonok();
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Szerződés-sablonok"
        subtitle="A sablon módosítása a már létrehozott szerződéseket nem érinti."
        actions={
          <Button asChild>
            <Link href="/ertekesites/szerzodesek/sablonok/new">Új sablon</Link>
          </Button>
        }
      />
      {sablonok.length === 0 ? (
        <p className="text-muted-foreground text-sm">Még nincs sablon.</p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {sablonok.map((s) => (
            <li key={s.id}>
              <Link
                href={`/ertekesites/szerzodesek/sablonok/${s.id}`}
                className="hover:bg-muted flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span>
                  <strong>{s.nev}</strong>
                  <span className="text-muted-foreground ml-2">{s.kategoria}</span>
                </span>
                <span className="flex gap-1.5">
                  {s.digitalisAlairasKell && (
                    <Badge variant="outline">Digitális aláírás</Badge>
                  )}
                  {!s.aktiv && <Badge variant="outline">Inaktív</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
