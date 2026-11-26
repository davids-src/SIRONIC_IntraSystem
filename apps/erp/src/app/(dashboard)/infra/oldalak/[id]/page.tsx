import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { Badge } from "@erp/ui";
import { ESEMENY_LABELS, infraApi } from "@erp/infra";
import {
  DangerZone,
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
} from "../../../eszkoz/_components/detail/detail-layout";
import { datum } from "../../_components/megjelenites";
import {
  OldalEllenorzes,
  OldalSzerkeszto,
  OldalTorles,
  SslMegujitGomb,
} from "../../_components/oldal-muveletek";

export default async function OldalAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("infra:oldal:read");
  const [irhat, torolhet, stackOlvas, partnerek] = await Promise.all([
    hasPermission("infra:oldal:write"),
    hasPermission("infra:oldal:delete"),
    hasPermission("infra:stack:read"),
    partnerApi.listPartnerOptions(),
  ]);
  const nevek = new Map(partnerek.map((p) => [p.id, p.nev]));
  const o = await infraApi.getOldal(id, { partnerNevek: nevek });
  if (!o) notFound();
  const [stackek, esemenyek] = await Promise.all([
    irhat ? infraApi.listStackSzolgaltatasok().catch(() => []) : Promise.resolve([]),
    infraApi.listEsemenyek({ celTipus: "oldal", celId: id, limit: 20 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={o.hostnevek[0] ?? o.nev}
        subtitle={
          o.hostnevek.length > 1
            ? `Aliasok: ${o.hostnevek.slice(1).join(", ")}`
            : undefined
        }
        backHref="/infra/oldalak"
        backLabel="Vissza az oldalakhoz"
        chips={
          <>
            {o.stackNev && <Badge variant="neutral">{o.stackNev}</Badge>}
            {o.partnerNev && <Badge variant="info">{o.partnerNev}</Badge>}
          </>
        }
        actions={
          <>
            <a
              href={`https://${o.hostnevek[0]}`}
              target="_blank"
              rel="noreferrer"
              className="border-input hover:bg-accent inline-flex h-9 items-center rounded-md border px-3 text-sm"
            >
              Megnyitás
            </a>
            {irhat && <SslMegujitGomb id={id} />}
          </>
        }
      />

      <Section
        id="allapot"
        title="Állapot"
        description="Élő ellenőrzés: DNS, proxy, SSL, konténer és a weboldal elérhetősége."
      >
        <OldalEllenorzes id={id} />
      </Section>

      <Section
        id="adatok"
        title="Beállítások"
        mode={irhat ? "editable" : "readonly"}
        description="Hova mutat az oldal, és melyik partnerhez tartozik."
      >
        {irhat ? (
          <OldalSzerkeszto
            id={id}
            kezdo={{
              nev: o.nev,
              hostnevek: o.hostnevek,
              stackId: o.stackId,
              szolgaltatas: o.szolgaltatas,
              port: o.port,
              sema: o.sema,
              websocket: o.websocket,
              sslKikenyszer: o.sslKikenyszer,
              partnerId: o.partnerId,
              megjegyzes: o.megjegyzes,
            }}
            stackek={stackek}
            partnerek={partnerek}
          />
        ) : (
          <Facts
            columns={2}
            items={[
              { label: "Cél", value: `${o.sema}://${o.szolgaltatas}:${o.port}` },
              { label: "Stack", value: o.stackNev },
              { label: "Partner", value: o.partnerNev },
            ]}
          />
        )}
      </Section>

      <Section
        id="szolgaltatok"
        title="Szolgáltatói adatok"
        description="Mit talált a szinkron a külső rendszerekben."
      >
        <Facts
          columns={2}
          items={[
            {
              label: "DNS",
              value: o.dns.cel
                ? `${o.dns.tipus} → ${o.dns.cel}${o.dns.proxied ? " (Cloudflare proxy)" : ""}`
                : undefined,
              missing: !o.dns.cel,
            },
            {
              label: "NPM proxy host",
              value: o.kulsoIdk.npmProxyHostId
                ? `#${o.kulsoIdk.npmProxyHostId}`
                : undefined,
              missing: !o.kulsoIdk.npmProxyHostId,
            },
            {
              label: "SSL tanúsítvány (NPM)",
              value: o.kulsoIdk.npmTanusitvanyId
                ? `#${o.kulsoIdk.npmTanusitvanyId}`
                : undefined,
              missing: !o.kulsoIdk.npmTanusitvanyId,
            },
            {
              label: "Séma / websocket / HTTPS kényszerítés",
              value: `${o.sema} / ${o.websocket ? "igen" : "nem"} / ${o.sslKikenyszer ? "igen" : "nem"}`,
            },
          ]}
        />
        {o.stackId && stackOlvas && (
          <p className="mt-3 text-sm">
            <Link href={`/infra/stackek/${o.stackId}`} className="underline">
              A(z) {o.stackNev} stack megnyitása
            </Link>
          </p>
        )}
      </Section>

      <Section id="esemenyek" title="Előzmények" mode="log">
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
                  {datum(e.letrehozva)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {torolhet && (
        <DangerZone>
          <div className="w-full">
            <OldalTorles id={id} fohost={o.hostnevek[0] ?? ""} />
          </div>
        </DangerZone>
      )}
    </div>
  );
}
