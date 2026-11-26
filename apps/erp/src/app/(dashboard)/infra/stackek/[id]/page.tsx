import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { Badge, Button } from "@erp/ui";
import { ESEMENY_LABELS, STACK_TIPUS_LABELS, envSzovegge, infraApi } from "@erp/infra";
import {
  DangerZone,
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
  SectionNav,
} from "../../../eszkoz/_components/detail/detail-layout";
import { AllapotBadge, datum } from "../../_components/megjelenites";
import { KonteinerekTabla, StackOldalakTabla } from "../../_components/tablak";
import {
  NaploNezo,
  StackAdatokForm,
  StackGombok,
  StackKonfig,
  StackTorles,
} from "../../_components/muveletek";

export default async function StackAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("infra:stack:read");
  const [irhat, muvelhet, torolhet, oldalIr, partnerek] = await Promise.all([
    hasPermission("infra:stack:write"),
    hasPermission("infra:stack:muvelet"),
    hasPermission("infra:stack:delete"),
    hasPermission("infra:oldal:write"),
    partnerApi.listPartnerOptions(),
  ]);
  const nevek = new Map(partnerek.map((p) => [p.id, p.nev]));
  const s = await infraApi.getStack(id, { partnerNevek: nevek });
  if (!s) notFound();
  const [fajl, esemenyek] = await Promise.all([
    irhat && s.allapot !== "elveszett"
      ? infraApi.getStackFajl(id).catch(() => null)
      : Promise.resolve(null),
    infraApi.listEsemenyek({ celTipus: "stack", celId: id, limit: 20 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={s.nev}
        subtitle={s.leiras}
        backHref="/infra/stackek"
        backLabel="Vissza a stackekhez"
        chips={
          <>
            <AllapotBadge allapot={s.allapot} />
            <Badge variant="neutral">{STACK_TIPUS_LABELS[s.tipus]}</Badge>
            {s.partnerNev && <Badge variant="info">{s.partnerNev}</Badge>}
          </>
        }
        actions={
          s.allapot !== "elveszett" && (
            <StackGombok id={id} fut={s.futoSzam > 0} muvelhet={muvelhet} />
          )
        }
      />
      {s.allapot === "elveszett" && (
        <div className="border-danger-border bg-danger-soft text-danger-soft-foreground rounded-md border p-3 text-sm">
          Ez a stack már nem létezik a Portaineren. A nyilvántartásból törölhető.
        </div>
      )}
      <SectionNav
        items={[
          { id: "szolgaltatasok", label: "Szolgáltatások" },
          { id: "oldalak", label: "Oldalak" },
          ...(fajl ? [{ id: "konfig", label: "Compose és env" }] : []),
          { id: "naplo", label: "Konténer napló" },
          ...(irhat ? [{ id: "adatok", label: "Adatok" }] : []),
          { id: "esemenyek", label: "Előzmények" },
        ]}
      />

      <Section
        id="szolgaltatasok"
        title="Szolgáltatások (konténerek)"
        description="A stack minden konténere a saját image-ével. Az „Image-ek frissítése” az egész stacket frissíti; az „Újraindítás” csak az adott konténert."
      >
        <KonteinerekTabla
          stackId={id}
          muvelhet={muvelhet}
          rows={s.konteynerek.map((k) => ({
            id: k.id,
            nev: k.nev,
            szolgaltatas: k.szolgaltatas ?? "",
            image: k.image,
            allapot: k.allapot,
            statusz: k.statusz ?? "",
            portok: k.portok.join(", "),
          }))}
        />
      </Section>

      <Section
        id="oldalak"
        title="Oldalak (domainek)"
        description="Az oldalak ennek a stacknek a szolgáltatásaira mutatnak. Egy stackhez több oldal tartozhat, mindegyik más szolgáltatásra és porton."
        action={
          oldalIr && (
            <Button asChild size="sm">
              <Link href={`/infra/oldalak/new?stack=${id}`}>Oldal hozzáadása</Link>
            </Button>
          )
        }
      >
        <StackOldalakTabla
          irhat={oldalIr}
          partnerek={partnerek}
          stackPartner={s.partnerNev}
          rows={s.oldalak.map((o) => ({
            id: o.id,
            hostnevek: o.hostnevek.join(", "),
            cel: `${o.szolgaltatas}:${o.port}`,
            partnerId: o.partnerId ?? "",
          }))}
        />
      </Section>

      {fajl && (
        <Section
          id="konfig"
          title="Compose és környezeti változók"
          mode="editable"
          description="Itt módosíthatod a stack compose fájlját és env-jét. A mentés után a Portainer újratelepíti a stacket. Titkos értékeket tartalmazhat, ezért csak szerkesztési joggal látható."
        >
          {muvelhet ? (
            <StackKonfig id={id} compose={fajl.compose} env={envSzovegge(fajl.env)} />
          ) : (
            <EmptyNote>
              A compose szerkesztéséhez „Stack műveletek” jog is kell.
            </EmptyNote>
          )}
        </Section>
      )}

      <Section
        id="naplo"
        title="Konténer napló"
        description="A konténer utolsó sorai (stdout/stderr)."
      >
        <NaploNezo id={id} konteynerek={s.konteynerek.map((k) => ({ nev: k.nev }))} />
      </Section>

      {irhat && (
        <Section
          id="adatok"
          title="Adatok"
          mode="editable"
          description="Csak a nyilvántartást érinti, a Portaineren nem változtat semmit."
        >
          <Facts
            columns={2}
            items={[
              { label: "Portainer azonosító", value: s.portainerId },
              { label: "Létrehozva", value: datum(s.letrehozva) },
              { label: "Utoljára telepítve", value: datum(s.frissitve) },
              {
                label: "Automatikus frissítés (webhook)",
                value: s.webhook ? "Be van állítva" : "Nincs",
              },
            ]}
          />
          <div className="mt-4">
            <StackAdatokForm
              id={id}
              tipus={s.tipus}
              partnerId={s.partnerId}
              leiras={s.leiras}
              partnerek={partnerek}
            />
          </div>
        </Section>
      )}

      <Section
        id="esemenyek"
        title="Előzmények"
        mode="log"
        description="Minden ezen a stacken végzett művelet — a compose és az env tartalma nem kerül a naplóba."
      >
        {esemenyek.length === 0 ? (
          <EmptyNote>Még nem volt művelet.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {esemenyek.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <Badge variant={e.ok ? "success" : "danger"}>
                  {e.ok ? "ok" : "hiba"}
                </Badge>
                <span>{ESEMENY_LABELS[e.muvelet]}</span>
                {e.uzenet && (
                  <span className="text-muted-foreground text-xs">{e.uzenet}</span>
                )}
                <span className="text-muted-foreground ml-auto text-xs">
                  {datum(e.letrehozva)} ·{" "}
                  {e.szereplo.startsWith("cli:") || e.szereplo.startsWith("mcp:")
                    ? e.szereplo
                    : "felhasználó"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {torolhet && (
        <DangerZone>
          <div className="w-full">
            <StackTorles id={id} nev={s.nev} oldalSzam={s.oldalak.length} />
          </div>
        </DangerZone>
      )}
    </div>
  );
}
