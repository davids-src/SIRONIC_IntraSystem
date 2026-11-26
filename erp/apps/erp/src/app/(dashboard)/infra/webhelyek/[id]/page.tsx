import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { Badge } from "@erp/ui";
import { ESEMENY_LABELS, WEBHELY_TIPUSOK, WEBHELY_TIPUS_LABELS } from "@erp/infra/client";
import { infraApi } from "@erp/infra";
import {
  DangerZone,
  DetailHeader,
  EmptyNote,
  Facts,
  Section,
} from "../../../eszkoz/_components/detail/detail-layout";
import { MezoForm } from "../../_components/mezo-form";
import { HozzaferesLista } from "../../_components/hozzaferesek";
import { WebhelyEllenorzes, WebhelyTorles } from "../../_components/webhely-muveletek";
import { datum } from "../../_components/megjelenites";
import { modositWebhelyAction } from "../../actions";

export default async function WebhelyAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("infra:webhely:read");
  const [irhat, torolhet, hozzOlvas, hozzIr, titkos, partnerek] = await Promise.all([
    hasPermission("infra:webhely:write"),
    hasPermission("infra:webhely:delete"),
    hasPermission("infra:hozzaferes:read"),
    hasPermission("infra:hozzaferes:write"),
    hasPermission("infra:hozzaferes:titkos"),
    partnerApi.listPartnerOptions(),
  ]);
  const nevek = new Map(partnerek.map((p) => [p.id, p.nev]));
  const w = await infraApi.getWebhely(id, { partnerNevek: nevek });
  if (!w) notFound();
  const esemenyek = await infraApi.listEsemenyek({
    celTipus: "webhely",
    celId: id,
    limit: 15,
  });
  const e = w.utolsoEllenorzes;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={w.nev}
        subtitle={w.hostnevek.join(", ")}
        backHref="/infra/webhelyek"
        backLabel="Vissza a webhelyekhez"
        chips={
          <>
            <Badge variant="neutral">{WEBHELY_TIPUS_LABELS[w.tipus]}</Badge>
            {w.partnerNev ? (
              <Badge variant="info">{w.partnerNev}</Badge>
            ) : (
              <Badge variant="neutral">Belső</Badge>
            )}
          </>
        }
        actions={
          <>
            <a
              href={`https://${w.hostnevek[0]}`}
              target="_blank"
              rel="noreferrer"
              className="border-input hover:bg-accent inline-flex h-9 items-center rounded-md border px-3 text-sm"
            >
              Megnyitás
            </a>
            {irhat && <WebhelyEllenorzes id={id} />}
          </>
        }
      />

      <Section id="allapot" title="Állapot" description="Az utolsó ellenőrzés eredménye.">
        {e ? (
          <Facts
            columns={2}
            items={[
              {
                label: "Eredmény",
                value: <Badge variant={e.ok ? "success" : "danger"}>{e.uzenet}</Badge>,
              },
              { label: "Ellenőrizve", value: datum(e.at) },
              { label: "HTTP státusz", value: e.statusz },
              {
                label: "WordPress",
                value:
                  e.wordpress === undefined
                    ? undefined
                    : e.wordpress
                      ? "Igen (a /wp-json válaszol)"
                      : "Nem észlelhető",
              },
            ]}
          />
        ) : (
          <EmptyNote>
            Még nem volt ellenőrzés. Az „Állapot ellenőrzése” gomb megnézi, elérhető-e a
            webhely.
          </EmptyNote>
        )}
      </Section>

      {hozzOlvas && (
        <Section
          id="hozzaferesek"
          title="Belépések (FTP, SFTP, WordPress admin…)"
          mode={hozzIr ? "editable" : "readonly"}
          description="A partnerhez tartozó belépések egy helyen. A jelszó titkosítva tárolódik, a képernyőn nem jelenik meg; a „Jelszó másolása” a vágólapra teszi, és naplózza a megtekintést."
        >
          <HozzaferesLista
            webhelyId={id}
            hozzaferesek={w.hozzaferesek}
            irhat={hozzIr}
            titkosLathat={titkos}
          />
        </Section>
      )}

      <Section
        id="adatok"
        title="Adatok"
        mode={irhat ? "editable" : "readonly"}
        description="Partner, tárhely, lejárat és megjegyzés."
      >
        {irhat ? (
          <MezoForm
            action={modositWebhelyAction.bind(null, id)}
            szekciok={[
              {
                title: "Alapadatok",
                mezok: [
                  { name: "nev", label: "Megnevezés", required: true },
                  {
                    name: "tipus",
                    label: "Típus",
                    type: "select",
                    options: WEBHELY_TIPUSOK.map((t) => ({
                      value: t,
                      label: WEBHELY_TIPUS_LABELS[t],
                    })),
                  },
                  {
                    name: "hostnevek",
                    label: "Hostnevek",
                    required: true,
                    wide: true,
                    hint: "Vesszővel vagy szóközzel elválasztva; az első a fő cím.",
                  },
                  {
                    name: "partnerId",
                    label: "Partner",
                    type: "select",
                    options: [
                      { value: "", label: "— belső / nincs —" },
                      ...partnerek.map((p) => ({ value: p.id, label: p.nev })),
                    ],
                  },
                  { name: "tarhely", label: "Tárhely / szolgáltató" },
                  { name: "lejarat", label: "Tárhely / domain lejárata", type: "date" },
                  { name: "megjegyzes", label: "Megjegyzés", wide: true },
                ],
              },
            ]}
            ertekek={{
              nev: w.nev,
              tipus: w.tipus,
              hostnevek: w.hostnevek.join(", "),
              partnerId: w.partnerId ?? "",
              tarhely: w.tarhely,
              lejarat: w.lejarat ? w.lejarat.slice(0, 10) : "",
              megjegyzes: w.megjegyzes,
            }}
            submitLabel="Mentés"
            redirectTo={`/infra/webhelyek/${id}`}
          />
        ) : (
          <Facts
            columns={2}
            items={[
              { label: "Partner", value: w.partnerNev ?? "Belső" },
              { label: "Tárhely", value: w.tarhely },
              {
                label: "Lejárat",
                value: w.lejarat
                  ? new Date(w.lejarat).toLocaleDateString("hu-HU")
                  : undefined,
              },
              { label: "Megjegyzés", value: w.megjegyzes },
            ]}
          />
        )}
      </Section>

      <Section
        id="esemenyek"
        title="Előzmények"
        mode="log"
        description="A jelszavak megtekintése is itt jelenik meg (az értékek nélkül)."
      >
        {esemenyek.length === 0 ? (
          <EmptyNote>Még nem volt művelet.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {esemenyek.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <Badge variant={x.ok ? "success" : "danger"}>
                  {x.ok ? "ok" : "hiba"}
                </Badge>
                <span>{ESEMENY_LABELS[x.muvelet]}</span>
                {x.uzenet && (
                  <span className="text-muted-foreground text-xs">{x.uzenet}</span>
                )}
                <span className="text-muted-foreground ml-auto text-xs">
                  {datum(x.letrehozva)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {torolhet && (
        <DangerZone>
          <WebhelyTorles id={id} nev={w.nev} db={w.hozzaferesek.length} />
        </DangerZone>
      )}
    </div>
  );
}
