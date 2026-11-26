import { Input, Label } from "@erp/ui";
import { checkPortalToken } from "@erp/portal-auth";
import { ActionForm } from "@/components/action-form";
import { acceptInviteAction } from "@/lib/actions";

export const metadata = { title: "Meghívó elfogadása", referrer: "no-referrer" as const };

export default async function MeghivoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const info = await checkPortalToken(token, "invite");
  if (!info)
    return (
      <p className="text-destructive text-sm">
        A meghívó érvénytelen vagy lejárt. Kérjen új meghívót a cége
        portál-adminisztrátorától.
      </p>
    );
  return (
    <>
      <p className="text-muted-foreground mb-4 text-sm">
        Üdvözöljük, {info.name}! Adja meg a jelszavát ({info.email}), majd belép a
        portálra.
      </p>
      <ActionForm
        action={acceptInviteAction}
        submitLabel="Jelszó beállítása"
        resetOnSuccess={false}
      >
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
    </>
  );
}
