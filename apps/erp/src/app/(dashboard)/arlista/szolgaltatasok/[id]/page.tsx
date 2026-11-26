import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Badge, Container } from "@erp/ui";
import { arlistaApi } from "@erp/arlista";
import { SzolgaltatasForm } from "../_components/szolgaltatas-form";
import { SzolgaltatasArchivalas } from "../_components/szolgaltatas-archivalas";

export const dynamic = "force-dynamic";

export default async function SzolgaltatasAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("arlista:szolgaltatas:write");
  const { id } = await params;
  const [szolgaltatas, kategoriak] = await Promise.all([
    arlistaApi.getSzolgaltatas(id),
    arlistaApi.listKategoriak(),
  ]);
  if (!szolgaltatas) notFound();

  return (
    <Container className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/arlista/szolgaltatasok"
          className="text-muted-foreground text-sm underline"
        >
          Vissza a szolgáltatás árlistához
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{szolgaltatas.nev}</h1>
          {szolgaltatas.archivalt && <Badge variant="warning">Archivált</Badge>}
        </div>
        {szolgaltatas.archivalt && szolgaltatas.archivalasOka && (
          <p className="text-muted-foreground mt-1 text-sm">
            Ok: {szolgaltatas.archivalasOka}
          </p>
        )}
      </div>
      {!szolgaltatas.archivalt && (
        <SzolgaltatasForm kategoriak={kategoriak} szolgaltatas={szolgaltatas} />
      )}
      <SzolgaltatasArchivalas id={szolgaltatas._id} archivalt={szolgaltatas.archivalt} />
    </Container>
  );
}
