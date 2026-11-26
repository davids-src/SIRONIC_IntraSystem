import Link from "next/link";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { arlistaApi } from "@erp/arlista";
import { KategoriaKezelo } from "./kategoria-kezelo";

export const dynamic = "force-dynamic";

export default async function KategoriakPage() {
  await requirePermission("arlista:szolgaltatas:write");
  const kategoriak = await arlistaApi.listKategoriak();
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div>
        <Link
          href="/arlista/szolgaltatasok"
          className="text-muted-foreground text-sm underline"
        >
          Vissza a szolgáltatás árlistához
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Szolgáltatás-kategóriák</h1>
        <p className="text-muted-foreground text-sm">
          Kategóriák és alkategóriák fája. A kódelőtag a létrehozás után nem módosítható,
          mert a kiadott kódok tartalmazzák.
        </p>
      </div>
      <KategoriaKezelo kategoriak={kategoriak} />
    </Container>
  );
}
