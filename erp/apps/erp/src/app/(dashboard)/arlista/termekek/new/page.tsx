import Link from "next/link";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { TermekForm } from "../_components/termek-form";

export default async function UjTermekPage() {
  await requirePermission("arlista:termek:write");
  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div>
        <Link href="/arlista/termekek" className="text-muted-foreground text-sm underline">
          Vissza a termék árlistához
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Új árlista-tétel</h1>
      </div>
      <TermekForm />
    </Container>
  );
}
