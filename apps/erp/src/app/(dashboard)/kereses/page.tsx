import Link from "next/link";
import { requireAuth } from "@erp/auth";
import { Badge, Container } from "@erp/ui";
import { Panel } from "@/components/panel";
import { KERESES_MIN_HOSSZ, globalisKereses } from "@/lib/kereses";

export const metadata = { title: "Keresés" };

export default async function KeresesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await requireAuth();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  const csoportok =
    q.length >= KERESES_MIN_HOSSZ
      ? await globalisKereses(q, {
          userId: user.id,
          permissions: user.permissions,
          name: user.name ?? undefined,
        })
      : [];

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <div>
        <h1 className="text-3xl font-bold">Keresés</h1>
        <p className="text-muted-foreground text-sm">
          Partnerek, árlista, készlet, ajánlatok, szerviz, bizonylatok, projektek és más —
          csak azokban a modulokban, amelyekhez van jogosultságod.
        </p>
      </div>

      <form action="/kereses" method="get" role="search" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          minLength={KERESES_MIN_HOSSZ}
          maxLength={100}
          placeholder="Mit keresel? (legalább 2 karakter)"
          aria-label="Keresett kifejezés"
          className="border-input bg-background h-10 flex-1 rounded-md border px-3 text-sm"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-medium"
        >
          Keresés
        </button>
      </form>

      {q.length > 0 && q.length < KERESES_MIN_HOSSZ && (
        <p className="text-muted-foreground text-sm">
          Írj be legalább {KERESES_MIN_HOSSZ} karaktert.
        </p>
      )}
      {q.length >= KERESES_MIN_HOSSZ && csoportok.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nincs találat a(z) „{q}” kifejezésre.
        </p>
      )}

      {csoportok.map((c) => (
        <Panel key={c.modul} title={c.cimke}>
          <ul className="flex flex-col divide-y">
            {c.talalatok.map((t) => (
              <li key={`${t.entityLabel}-${t.entityId}`} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={t.url}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {t.title}
                    </Link>
                    {t.subtitle && (
                      <p className="text-muted-foreground truncate text-xs">
                        {t.subtitle}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{t.entityLabel}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </Container>
  );
}
