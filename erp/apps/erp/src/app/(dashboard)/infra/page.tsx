import Link from "next/link";
import { hasPermission, requirePermission } from "@erp/auth";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
} from "@erp/ui";
import {
  INTEGRACIO_LABELS,
  ESEMENY_LABELS,
  infraApi,
  type IntegracioSzolgaltato,
} from "@erp/infra";
import { SzinkronGomb } from "./_components/muveletek";
import { KonteinerAllapotBadge, datum } from "./_components/megjelenites";

function Szam({
  cimke,
  ertek,
  hint,
  href,
  ton,
}: {
  cimke: string;
  ertek: number | string;
  hint?: string;
  href?: string;
  ton?: "danger" | "warning";
}) {
  const belso = (
    <Card
      className={
        ton === "danger"
          ? "border-danger-border"
          : ton === "warning"
            ? "border-warning-border"
            : undefined
      }
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {cimke}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{ertek}</div>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{belso}</Link> : belso;
}

export default async function InfraAttekintesPage() {
  await requirePermission("infra:stack:read");
  const [muvelhet, oldalOlvas] = await Promise.all([
    hasPermission("infra:stack:muvelet"),
    hasPermission("infra:oldal:read"),
  ]);
  const [a, esemenyek] = await Promise.all([
    infraApi.attekintes(),
    infraApi.listEsemenyek({ limit: 8 }),
  ]);
  const lejart = a.tanusitvanyok.lejarKozel.filter((c) => c.napok < 0);
  const kozel = a.tanusitvanyok.lejarKozel.filter((c) => c.napok >= 0);
  const bajok = a.konteinerek.problemas.length + a.stackek.hibas + lejart.length;

  return (
    <Container className="flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Infrastruktúra</h1>
          <p className="text-muted-foreground text-sm">
            Stackek (Portainer), oldalak (domain → stack szolgáltatás, NPM + Cloudflare)
            és az SSL tanúsítványok egy helyen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {muvelhet && <SzinkronGomb />}
          {oldalOlvas && (
            <Button asChild>
              <Link href="/infra/oldalak/new">Új oldal</Link>
            </Button>
          )}
        </div>
      </div>

      {a.hibak.length > 0 && (
        <div className="border-warning-border bg-warning-soft text-warning-soft-foreground rounded-md border p-3 text-sm">
          {a.hibak.map((h) => (
            <p key={h}>{h}</p>
          ))}
          <p className="mt-1 text-xs">
            Ellenőrizd az{" "}
            <Link href="/infra/integraciok" className="underline">
              Integrációkat
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Szam
          cimke="Stackek"
          ertek={a.stackek.osszes}
          hint={`${a.stackek.fut} fut${a.stackek.hibas ? `, ${a.stackek.hibas} hibás` : ""}${a.stackek.leallitva ? `, ${a.stackek.leallitva} leállítva` : ""}`}
          href="/infra/stackek"
          ton={a.stackek.hibas ? "danger" : undefined}
        />
        <Szam
          cimke="Konténerek"
          ertek={`${a.konteinerek.fut}/${a.konteinerek.osszes}`}
          hint="fut / összes"
          ton={a.konteinerek.problemas.length ? "warning" : undefined}
        />
        <Szam
          cimke="Oldalak"
          ertek={a.oldalak.osszes}
          hint={
            a.oldalak.stacknelkul
              ? `${a.oldalak.stacknelkul} külső cél (nem stack)`
              : "mind stackhez kötve"
          }
          href="/infra/oldalak"
        />
        <Szam
          cimke="SSL tanúsítványok"
          ertek={a.tanusitvanyok.osszes}
          hint={
            lejart.length
              ? `${lejart.length} lejárt`
              : kozel.length
                ? `${kozel.length} hamarosan lejár`
                : "mind érvényes"
          }
          ton={lejart.length ? "danger" : kozel.length ? "warning" : undefined}
        />
      </div>

      {bajok === 0 && a.hibak.length === 0 && (
        <p className="text-success text-sm">
          ✓ Minden stack és konténer rendben fut, nincs lejárt tanúsítvány.
        </p>
      )}

      {a.konteinerek.problemas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Figyelmet igénylő konténerek</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {a.konteinerek.problemas.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <KonteinerAllapotBadge allapot={c.allapot} />
                <span className="font-medium">{c.nev}</span>
                {c.stackId && (
                  <Link
                    href={`/infra/stackek/${c.stackId}`}
                    className="text-muted-foreground underline"
                  >
                    {c.stackNev}
                  </Link>
                )}
                <span className="text-muted-foreground text-xs">{c.statusz}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {a.tanusitvanyok.lejarKozel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>SSL tanúsítványok — lejárt vagy hamarosan lejár</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {a.tanusitvanyok.lejarKozel.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <Badge variant={c.napok < 0 ? "danger" : "warning"}>
                  {c.napok < 0 ? `lejárt ${-c.napok} napja` : `${c.napok} nap`}
                </Badge>
                <span>{c.nevek.join(", ")}</span>
                <span className="text-muted-foreground text-xs">#{c.id}</span>
              </div>
            ))}
            <p className="text-muted-foreground mt-2 text-xs">
              Az érintett oldal adatlapján az „SSL megújítása most” gombbal újítható meg
              (Let&apos;s Encrypt, DNS-01).
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Szolgáltatói kapcsolatok</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {a.integraciok.length === 0 && (
              <p className="text-muted-foreground">Még nincs integráció.</p>
            )}
            {a.integraciok.map((i) => (
              <div
                key={`${i.szolgaltato}-${i.cimke}`}
                className="flex flex-wrap items-center gap-2"
              >
                <Badge
                  variant={i.ok === undefined ? "neutral" : i.ok ? "success" : "danger"}
                >
                  {i.ok === undefined ? "nem tesztelt" : i.ok ? "működik" : "hiba"}
                </Badge>
                <span className="font-medium">
                  {INTEGRACIO_LABELS[i.szolgaltato as IntegracioSzolgaltato]}
                </span>
                <span className="text-muted-foreground">{i.cimke}</span>
              </div>
            ))}
            <Link
              href="/infra/integraciok"
              className="text-muted-foreground mt-1 text-xs underline"
            >
              Integrációk kezelése
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stackhez nem tartozó konténerek</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {a.arva.length === 0 && <p className="text-muted-foreground">Nincs ilyen.</p>}
            {a.arva.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <KonteinerAllapotBadge allapot={c.allapot} />
                <span className="font-medium">{c.nev}</span>
                <span className="text-muted-foreground text-xs">
                  {c.image.slice(0, 40)}
                </span>
              </div>
            ))}
            {a.arva.length > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                Ezek nem Portainer stackből indultak (pl. maga a Portainer, vagy már
                törölt stack maradványai).
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Legutóbbi műveletek</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 text-sm">
          {esemenyek.length === 0 && (
            <p className="text-muted-foreground">Még nem volt művelet.</p>
          )}
          {esemenyek.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2">
              <Badge variant={e.ok ? "success" : "danger"}>{e.ok ? "ok" : "hiba"}</Badge>
              <span>{ESEMENY_LABELS[e.muvelet]}</span>
              {e.celNev && <span className="font-medium">{e.celNev}</span>}
              {e.uzenet && (
                <span className="text-muted-foreground text-xs">{e.uzenet}</span>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                {datum(e.letrehozva)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
