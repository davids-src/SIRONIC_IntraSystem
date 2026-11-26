import Link from "next/link";
import { Input, Label } from "@erp/ui";
import { ActionForm } from "@/components/action-form";
import { requestResetAction } from "@/lib/actions";

export const metadata = { title: "Elfelejtett jelszó" };

export default function ElfelejtettJelszoPage() {
  return (
    <>
      <p className="text-muted-foreground mb-4 text-sm">
        Adja meg az e-mail címét, és küldünk egy hivatkozást az új jelszó beállításához.
      </p>
      <ActionForm action={requestResetAction} submitLabel="Hivatkozás kérése">
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">E-mail cím</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </ActionForm>
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-primary underline-offset-2 hover:underline">
          Vissza a belépéshez
        </Link>
      </p>
    </>
  );
}
