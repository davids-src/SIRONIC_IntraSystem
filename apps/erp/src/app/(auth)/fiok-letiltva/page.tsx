import { KijelentkezesGomb } from "./kijelentkezes-gomb";

/**
 * Where `requireAuth` sends a session whose account has been deactivated since it signed in
 * (e.g. by the offboarding's "ERP-fiók letiltása"). No auth check here on purpose — that would
 * send it straight back. Signing out clears the cookie the middleware still trusts.
 */
export default function FiokLetiltvaPage() {
  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-2xl font-semibold">A fiókod le van tiltva</h1>
      <p className="text-muted-foreground text-sm">
        Ezzel a fiókkal már nem lehet belépni a rendszerbe. Ha szerinted ez tévedés,
        keresd a HR-t vagy a rendszergazdát.
      </p>
      <KijelentkezesGomb />
    </div>
  );
}
