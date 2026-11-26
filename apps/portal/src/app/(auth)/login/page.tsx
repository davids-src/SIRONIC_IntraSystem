import Link from "next/link";
import { Input, Label } from "@erp/ui";
import { ActionForm } from "@/components/action-form";
import { loginAction } from "@/lib/actions";

export const metadata = { title: "Belépés" };

export default function LoginPage() {
  return (
    <>
      <ActionForm action={loginAction} submitLabel="Belépés" resetOnSuccess={false}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">E-mail cím</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="password">Jelszó</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      </ActionForm>
      <p className="mt-4 text-sm">
        <Link
          href="/elfelejtett-jelszo"
          className="text-primary underline-offset-2 hover:underline"
        >
          Elfelejtett jelszó
        </Link>
      </p>
    </>
  );
}
