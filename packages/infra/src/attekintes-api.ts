/** Cross-cutting reads: live overview, full sync, DB summary, search and the partner-portal view. */
import { connectDB } from "@erp/db-core";
import { SEARCH_PER_TYPE, type SearchHit, type SearchViewer } from "@erp/core";
import { INFRA_PERMISSIONS as P } from "./constants";
import { IntegracioKapcsolat, InfraOldal, InfraStack } from "./models";
import { kliensek } from "./kontextus";
import { szuksegesKliens } from "./kliensek";
import { naplo } from "./esemeny";
import { csoportosit, eloBetolt, stackSzinkron } from "./stack-api";
import { oldalSzinkron } from "./oldal-api";
import { hibaSzoveg, hiba, iso, ok, type InfraResult, type Szereplo } from "./shared";
import { lejaratNapok, stackAllapot, tanusitvanyKozel } from "./szabalyok";
import type { Attekintes, KonteinerProblema, SzinkronEredmeny } from "./tipusok";

export type PortalOldal = {
  id: string;
  nev: string;
  hostnev: string;
  hostnevek: string[];
  url: string;
};

export const attekintesApi = {
  /** Live dashboard: stacks, containers, certificates, providers. Failing providers are listed, not thrown. */
  async attekintes(): Promise<Attekintes> {
    await connectDB();
    const k = await kliensek();
    const hibak: string[] = [];
    const out: Attekintes = {
      stackek: { osszes: 0, fut: 0, hibas: 0, leallitva: 0 },
      konteinerek: { osszes: 0, fut: 0, problemas: [] },
      oldalak: {
        osszes: await InfraOldal.countDocuments(),
        stacknelkul: await InfraOldal.countDocuments({
          $or: [{ stackId: null }, { stackId: { $exists: false } }],
        }),
      },
      tanusitvanyok: { osszes: 0, lejarKozel: [] },
      arva: [],
      integraciok: [],
      hibak,
    };
    const kapcsolatok = await IntegracioKapcsolat.find()
      .sort({ szolgaltato: 1 })
      .lean()
      .exec();
    out.integraciok = kapcsolatok.map((c) => ({
      szolgaltato: c.szolgaltato,
      cimke: c.cimke,
      ok: c.utolsoEllenorzesOk,
      uzenet: c.utolsoEllenorzesUzenet,
      ellenorzes: iso(c.utolsoEllenorzes),
    }));

    if (k.portainer) {
      try {
        const elo = await eloBetolt(k.portainer);
        const { sorok } = await stackSzinkron(elo);
        const { stackenkent, arva } = csoportosit(elo);
        out.arva = arva;
        out.konteinerek.osszes = elo.konteinerek.length;
        out.konteinerek.fut = elo.konteinerek.filter((c) => c.State === "running").length;
        out.stackek.osszes = sorok.length;
        for (const r of sorok) {
          const kont = stackenkent.get(r.portainerStackId) ?? [];
          const al = stackAllapot(
            kont.map((x) => ({ nev: x.nev, state: x.allapot })),
            r.elveszett,
          );
          if (al === "fut") out.stackek.fut += 1;
          else if (al === "hibas" || al === "elveszett") out.stackek.hibas += 1;
          else if (al === "leallitva" || al === "ures") out.stackek.leallitva += 1;
          for (const c of kont) {
            if (c.allapot !== "running" && c.allapot !== "created")
              out.konteinerek.problemas.push({
                ...c,
                stackNev: r.nev,
                stackId: String(r._id),
              } satisfies KonteinerProblema);
          }
        }
      } catch (err) {
        hibak.push(`Portainer: ${hibaSzoveg(err)}`);
      }
    } else hibak.push("Nincs Portainer integráció.");

    if (k.npm) {
      try {
        const certek = await k.npm.listCertificates();
        out.tanusitvanyok.osszes = certek.length;
        for (const c of certek) {
          if (tanusitvanyKozel(c))
            out.tanusitvanyok.lejarKozel.push({
              id: c.id,
              nevek: c.domain_names,
              napok: lejaratNapok(c.expires_on) ?? 0,
            });
        }
        out.tanusitvanyok.lejarKozel.sort((a, b) => a.napok - b.napok);
      } catch (err) {
        hibak.push(`NPM: ${hibaSzoveg(err)}`);
      }
    } else hibak.push("Nincs NPM integráció.");
    return out;
  },

  /** Full discovery: Portainer stacks + NPM proxy hosts (+ Cloudflare facts) → stacks and sites. */
  async szinkron(
    szereplo: Szereplo,
  ): Promise<InfraResult<{ eredmeny: SzinkronEredmeny }>> {
    try {
      const k = await kliensek();
      const p = szuksegesKliens(k, "portainer");
      const elo = await eloBetolt(p);
      const st = await stackSzinkron(elo);
      const ol = await oldalSzinkron(k);
      const eredmeny: SzinkronEredmeny = {
        stackek: { osszes: elo.stackek.length, uj: st.uj, elveszett: st.elveszett },
        oldalak: {
          osszes: ol.osszes,
          uj: ol.uj,
          frissitve: ol.frissitve,
          elveszett: ol.elveszett,
        },
        figyelmeztetesek: ol.figyelmeztetesek,
      };
      await naplo({
        muvelet: "szinkron",
        celTipus: "rendszer",
        ok: true,
        reszletek: { ...eredmeny },
        szereplo,
      });
      return ok(undefined, { eredmeny });
    } catch (err) {
      const message = hibaSzoveg(err);
      await naplo({
        muvelet: "szinkron",
        celTipus: "rendszer",
        ok: false,
        uzenet: message,
        szereplo,
      });
      return hiba(message);
    }
  },

  /** DB-only counts for the ERP dashboard tile (no provider calls). */
  async getOsszegzes(): Promise<{ stackek: number; oldalak: number }> {
    await connectDB();
    const [stackek, oldalak] = await Promise.all([
      InfraStack.countDocuments({ elveszett: false }),
      InfraOldal.countDocuments(),
    ]);
    return { stackek, oldalak };
  },

  /** Global search: a few hits per entity type, gated on the viewer's read permissions. */
  async search(query: string, viewer: SearchViewer): Promise<SearchHit[]> {
    const term = query.trim();
    if (term.length < 2) return [];
    if (![P.stackRead, P.oldalRead].some((k) => viewer.permissions.includes(k)))
      return [];
    await connectDB();
    const re = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const out: SearchHit[] = [];
    if (viewer.permissions.includes(P.stackRead)) {
      const rows = await InfraStack.find({ $or: [{ nev: re }, { leiras: re }] })
        .limit(SEARCH_PER_TYPE)
        .lean()
        .exec();
      for (const r of rows)
        out.push({
          module: "infra",
          entityLabel: "Stack",
          entityId: String(r._id),
          title: r.nev,
          subtitle: r.leiras,
          url: `/infra/stackek/${r._id}`,
        });
    }
    if (viewer.permissions.includes(P.oldalRead)) {
      const rows = await InfraOldal.find({ $or: [{ hostnevek: re }, { nev: re }] })
        .limit(SEARCH_PER_TYPE)
        .lean()
        .exec();
      for (const r of rows)
        out.push({
          module: "infra",
          entityLabel: "Oldal",
          entityId: String(r._id),
          title: r.hostnevek[0] ?? r.nev,
          subtitle: `${r.szolgaltatas}:${r.port}`,
          url: `/infra/oldalak/${r._id}`,
        });
    }
    return out;
  },

  /**
   * Partner-portal read: only the partner's own sites (a site's partner, else its stack's partner),
   * no infrastructure detail (no stack, service, ports or ids of providers).
   */
  async portalOldalak(nezo: {
    kind: string;
    partnerId?: string;
  }): Promise<PortalOldal[]> {
    if (nezo.kind !== "portal" || !nezo.partnerId) return [];
    const partnerId = nezo.partnerId;
    await connectDB();
    const sajatStackek = (
      await InfraStack.find({ partnerId }).select("_id").lean().exec()
    ).map((s) => String(s._id));
    const rows = await InfraOldal.find({
      $or: [
        { partnerId },
        { partnerId: { $in: [null, undefined] }, stackId: { $in: sajatStackek } },
      ],
    })
      .sort({ nev: 1 })
      .lean()
      .exec();
    return rows
      .filter(
        (r) =>
          r.partnerId === partnerId ||
          (!r.partnerId && r.stackId && sajatStackek.includes(r.stackId)),
      )
      .map((r) => ({
        id: String(r._id),
        nev: r.nev,
        hostnev: r.hostnevek[0] ?? "",
        hostnevek: r.hostnevek,
        url: `https://${r.hostnevek[0]}`,
      }));
  },
};
