import { requirePermission } from "@erp/auth";
import { kategoriaAdminApi } from "@erp/feladat";
import { Container } from "@erp/ui";
import { KategoriaLista } from "./_components/kategoria-lista";

export default async function FeladatKategoriakPage() {
  await requirePermission("admin:access");
  const sorok = await kategoriaAdminApi.listAdmin();
  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Feladat kategóriák</h1>
        <p className="text-muted-foreground text-sm">
          Ezek közül választhatnak a felhasználók a feladatok kategóriájánál. Az alaplista
          a modulok nevei; újakat felvehetsz, a meglévőket átnevezheted vagy
          inaktiválhatod.
        </p>
      </div>
      <KategoriaLista sorok={sorok} />
    </Container>
  );
}
