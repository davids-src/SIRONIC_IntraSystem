import type { Metadata } from "next";
import { headers } from "next/headers";
import { bizonylatApi } from "@erp/bizonylat";
import { IgazolasDontes } from "@/components/igazolas-dontes";
import { IgazolasReszletek } from "@/components/igazolas-reszletek";
import {
  acceptCertificateByTokenAction,
  rejectCertificateByTokenAction,
} from "@/lib/actions";
import { clientKey, igazolasMegtekintesLimiter } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Teljesítésigazolás",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

function Uzenet({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center p-4">
      <p className="bg-card w-full rounded-lg border p-6 text-sm shadow-sm">{children}</p>
    </main>
  );
}

/**
 * Public sign-off page (no login): the one-time token in the URL is the credential. The token
 * is handed to the facade only — it is never logged, and the page is rate limited per client.
 */
export default async function IgazolasTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!igazolasMegtekintesLimiter.hit(clientKey(await headers())).ok)
    return <Uzenet>Túl sok kérés érkezett. Kérjük, próbálja újra egy perc múlva.</Uzenet>;

  const d = await bizonylatApi.getIgazolasTokennel(token);
  if (!d)
    return (
      <Uzenet>
        Ez a hivatkozás érvénytelen, lejárt, vagy az igazolást már elfogadták /
        elutasították. Kérdés esetén keresse a SIRONIC munkatársát.
      </Uzenet>
    );
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">
        SIRONIC
      </p>
      <h1 className="mb-6 text-2xl font-semibold">{d.cim}</h1>
      <IgazolasReszletek d={d} />
      <div className="mt-6">
        <IgazolasDontes
          accept={acceptCertificateByTokenAction.bind(null, token)}
          reject={rejectCertificateByTokenAction.bind(null, token)}
        />
      </div>
    </main>
  );
}
