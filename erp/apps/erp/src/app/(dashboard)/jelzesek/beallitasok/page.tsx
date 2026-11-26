import Link from "next/link";
import { requireAuth } from "@erp/auth";
import { jelzesApi } from "@erp/jelzes";
import { isSmtpConfigured } from "@erp/mail";
import { Container } from "@erp/ui";
import { ErtesitesKapcsolo } from "../../_components/ertesites-kapcsolo";
import { EmailBeallitasok } from "../_components/email-beallitasok";

/**
 * Értesítési beállítások — where notifications reach the user (desktop push on this device,
 * the opt-in e-mail categories). Its own page, so the Értesítési központ opens on the list.
 */
export default async function ErtesitesiBeallitasokPage() {
  const user = await requireAuth();
  const emailBeallitasok = await jelzesApi.emailBeallitasok(user.id);

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div>
        <Link href="/jelzesek" className="text-muted-foreground text-sm hover:underline">
          ← Értesítési központ
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Értesítési beállítások</h1>
        <p className="text-muted-foreground text-sm">
          Hol értesülj a neked szóló jelzésekről: asztali értesítés ezen az eszközön és
          e-mail.
        </p>
      </div>
      <section className="bg-card flex flex-col gap-2 rounded-md border p-4">
        <h2 className="text-base font-semibold">Asztali értesítések ezen az eszközön</h2>
        <ErtesitesKapcsolo reszletes />
      </section>
      <section className="bg-card flex flex-col gap-2 rounded-md border p-4">
        <h2 className="text-base font-semibold">E-mail értesítések</h2>
        <EmailBeallitasok
          kezdo={emailBeallitasok}
          email={user.email}
          smtp={isSmtpConfigured()}
        />
      </section>
    </Container>
  );
}
