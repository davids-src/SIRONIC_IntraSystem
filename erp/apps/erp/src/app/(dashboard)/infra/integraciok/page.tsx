import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import { Button, Container } from "@erp/ui";
import { INTEGRACIO_LABELS, INTEGRACIO_SZOLGALTATOK, infraApi } from "@erp/infra";
import { IntegracioKartyak } from "../_components/integracio-teszt";

export default async function IntegraciokPage() {
  await requirePermission("infra:integracio:read");
  const canWrite = await hasPermission("infra:integracio:write");
  const lista = await infraApi.listIntegraciok();
  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Integrációk</h1>
          <p className="text-muted-foreground text-sm">
            A Portainer (stackek), az Nginx Proxy Manager (proxy, SSL) és a Cloudflare
            (DNS) kapcsolatai. A hitelesítő adatok titkosítva tárolódnak, és a felületen
            soha nem jelennek meg.
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {INTEGRACIO_SZOLGALTATOK.filter((s) => s !== "github").map((s) => (
              <Button key={s} asChild variant="outline" size="sm">
                <Link href={`/infra/integraciok/new?szolgaltato=${s}`}>
                  + {INTEGRACIO_LABELS[s]}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>
      {lista.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Még nincs kapcsolat. A Portainer, az NPM és a Cloudflare felvétele után
          indítható a szinkron.
        </p>
      ) : (
        <IntegracioKartyak
          tesztelhet={canWrite}
          kapcsolatok={lista.map((k) => ({
            id: k._id,
            szolgaltato: k.szolgaltato as never,
            cimke: k.cimke,
            alapUrl: k.alapUrl,
            aktiv: k.aktiv,
            utolsoEllenorzes: k.utolsoEllenorzes,
            utolsoEllenorzesOk: k.utolsoEllenorzesOk,
            utolsoEllenorzesUzenet: k.utolsoEllenorzesUzenet,
          }))}
        />
      )}
    </Container>
  );
}
