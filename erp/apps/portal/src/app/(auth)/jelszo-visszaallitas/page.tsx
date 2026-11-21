import Link from "next/link";
import { Input, Label } from "@erp/ui";
import { checkPortalToken } from "@erp/portal-auth";
import { ActionForm } from "@/components/action-form";
import { resetPasswordAction } from "@/lib/actions";

export const metadata = {
  title: "Jelszó visszaállítása",
  referrer: "no-referrer" as const,
};

export default async function JelszoVisszaallitasPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const info = await checkPortalToken(token, "reset");
  if (!info)
    return (
      <p className="text-destructive text-sm">
        A hivatkozás érvénytelen vagy lejárt.{" "}
        <Link href="/elfelejtett-jelszo" className="underline">
          Új hivatkozás kérése
        </Link>
      </p>
    );
  return (
    <>
      <ActionForm action={resetPasswordAction} submitLabel="Jelszó mentése">
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="password">Új jelszó (min. 10 karakter)</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="password2">Jelszó újra</Label>
          <Input
            id="password2"
            name="password2"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
      </ActionForm>
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-primary underline-offset-2 hover:underline">
          Belépés
        </Link>
      </p>
    </>
  );
}
