import { hasPermission, requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { KESZLET_PERMISSIONS as P, keszletApi } from "@erp/keszlet";
import { RaktarhelyKezelo } from "./_components/raktarhely-kezelo";

export const dynamic = "force-dynamic";

export default async function RaktarhelyekPage() {
  await requirePermission(P.keszletRead);
  const [helyek, canWrite] = await Promise.all([
    keszletApi.listRaktarhelyek(),
    hasPermission(P.keszletWrite),
  ]);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Raktárhelyek</h1>
        <p className="text-muted-foreground text-sm">
          A kód fa szerkezetű: a „/” jel mélyebb szintet jelöl (pl. FO, FO/A, FO/A/12).
        </p>
      </div>
      <RaktarhelyKezelo helyek={helyek} szerkesztheto={canWrite} />
    </Container>
  );
}
