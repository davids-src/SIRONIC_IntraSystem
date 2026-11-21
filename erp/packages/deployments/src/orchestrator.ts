/**
 * Step orchestrator (docs/deployments/04). Production Mongo is a standalone without
 * transactions, so every state change is one conditional atomic update on the single Telepítés
 * document (the expected state is part of the filter). A failed step stays `hibas` and every
 * finished step stays `kesz` — the pipeline is resumable by re-running the failed step; nothing
 * is ever rolled back automatically.
 *
 * The orchestrator never reads credentials: it receives the integration clients through
 * `LepesKliensek` ports, built by the caller from the encrypted connections (`kliensek.ts`).
 */
import { Types } from "mongoose";
import { connectDB } from "@erp/db-core";
import { decryptSecret } from "@erp/lib/utils";
import { IntegrationError, redact } from "@erp/integrations";
import {
  type EsemenySzereploTipus,
  type LepesKulcs,
  type TelepitesAllapot,
  type TelepitesEventTipus,
} from "./constants";
import { Telepites, type ITelepites } from "./models/Telepites";
import { StackSablon } from "./models/egyeb";
import { TelepitesEsemeny } from "./models/egyeb";
import { renderSablon } from "./sablon";
import {
  LEPES_DEFINICIOK,
  idempotenciaKulcs,
  levezetTelepitesAllapot,
} from "./szabalyok";
import { LEPES_REGISZTER } from "./lepesek";
import {
  OrchestratorHiba,
  lepesAdat,
  type LepesEllenorzes,
  type LepesEredmeny,
  type LepesInput,
  type LepesKliensek,
  type LepesKontextus,
  type LepesTerv,
  type TelepitesNezetAdat,
} from "./lepesek/tipusok";

/** A `fut` step older than this is considered abandoned (crashed request) and may be re-run. */
export const LEPES_AKADAS_PERCEK = 35;

export type Szereplo = {
  id: string;
  tipus?: EsemenySzereploTipus;
  /** May bypass an unverified skipped dependency (`deployments:telepites:delete` holders). */
  felulirhat?: boolean;
};

export type LepesParam = {
  telepitesId: string;
  lepesKulcs: LepesKulcs;
  szereplo: Szereplo;
  kliensek?: LepesKliensek;
  input?: LepesInput;
  /** Test seam: current time. */
  most?: Date;
};

export type LepesKimenet<T> = { allapot: TelepitesAllapot; eredmeny: T; noop?: boolean };

const oid = (id: string) => new Types.ObjectId(id);

async function betolt(id: string): Promise<ITelepites> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) {
    throw new OrchestratorHiba("TELEPITES_NINCS", "A telepítés nem található.");
  }
  const doc = await Telepites.findById(id).lean<ITelepites>().exec();
  if (!doc) throw new OrchestratorHiba("TELEPITES_NINCS", "A telepítés nem található.");
  return doc;
}

export function nezetAdat(doc: ITelepites): TelepitesNezetAdat {
  return {
    id: String(doc._id),
    domain: doc.domain ?? "",
    wwwAtiranyitas: doc.wwwAtiranyitas,
    dns: {
      rekordTipus: doc.dns.rekordTipus,
      nev: doc.dns.nev,
      cel: doc.dns.cel,
      proxied: doc.dns.proxied,
    },
    proxy: {
      celHost: doc.proxy.celHost,
      celPort: doc.proxy.celPort,
      celSema: doc.proxy.celSema,
      websocket: doc.proxy.websocket,
    },
    image: {
      repo: doc.image.repo,
      tag: doc.image.tag,
      workflowId: doc.image.workflowId,
      workflowRef: doc.image.workflowRef,
    },
    stack: {
      nev: doc.stack.nev,
      sablonId: doc.stack.sablonId,
      composeYaml: doc.stack.composeYaml,
    },
    kulsoIdk: {
      ...doc.kulsoIdk,
      cloudflareDnsRekordIdk: [...(doc.kulsoIdk.cloudflareDnsRekordIdk ?? [])],
    },
    lepesek: doc.lepesek.map((l) => ({
      kulcs: l.kulcs,
      allapot: l.allapot,
      kulsoId: l.kulsoId,
      meta: l.meta ?? null,
    })),
  };
}

const szandek = (t: TelepitesNezetAdat, doc: ITelepites) => ({
  domain: t.domain,
  wwwAtiranyitas: t.wwwAtiranyitas,
  dns: t.dns,
  proxy: t.proxy,
  image: t.image,
  // The env values are part of the stack intent; secrets only through their ciphertext.
  stack: {
    ...t.stack,
    env: doc.stack.env.map((e) => [e.nev, e.ertek ?? null, e.titkosErtek ?? null]),
  },
});

/** Appends one row to the append-only log. `reszlet` is redacted before it is stored. */
export async function esemenyNaploz(p: {
  telepitesId: string;
  lepesKulcs?: LepesKulcs | null;
  tipus: TelepitesEventTipus;
  szereplo: Szereplo;
  uzenet: string;
  reszlet?: unknown;
  idotartamMs?: number | null;
}): Promise<void> {
  await connectDB();
  await TelepitesEsemeny.create({
    telepitesId: p.telepitesId,
    lepesKulcs: p.lepesKulcs ?? null,
    tipus: p.tipus,
    szereploId: p.szereplo.id,
    szereploTipus: p.szereplo.tipus ?? "munkatars",
    uzenet: p.uzenet,
    reszlet: p.reszlet !== undefined ? redact(p.reszlet) : null,
    idotartamMs: p.idotartamMs ?? null,
  });
}

function kontextus(doc: ITelepites, kliensek: LepesKliensek, most: Date): LepesKontextus {
  const t = nezetAdat(doc);
  const ertekek = (): Record<string, string> => {
    const v: Record<string, string> = {
      STACK_NAME: doc.stack.nev ?? "",
      IMAGE: doc.image.repo ?? "",
      IMAGE_TAG: doc.image.tag ?? "latest",
      DOMAIN: doc.domain ?? "",
    };
    for (const e of doc.stack.env) {
      v[e.nev] = e.titkos
        ? e.titkosErtek
          ? decryptSecret(e.titkosErtek)
          : ""
        : (e.ertek ?? "");
    }
    return v;
  };
  return {
    telepites: t,
    kliensek,
    most,
    async stackRender() {
      if (!doc.stack.nev) {
        throw new OrchestratorHiba(
          "STACK_NEV_HIANYZIK",
          "Nincs megadva a Portainer stack neve.",
        );
      }
      let compose: string;
      let halozatok: string[] = [];
      let helyorzok: Array<{
        kulcs: string;
        cimke: string;
        kotelezo: boolean;
        alapertek?: string;
        titkos: boolean;
      }> = [];
      // The Telepítés's own compose wins; the referenced template is the fallback.
      if (doc.stack.composeYaml) {
        compose = doc.stack.composeYaml;
      } else {
        if (!doc.stack.sablonId || !Types.ObjectId.isValid(doc.stack.sablonId)) {
          throw new OrchestratorHiba(
            "SABLON_HIANYZIK",
            "Nincs kiválasztva stack sablon, és a telepítésnek nincs saját compose-a sem.",
          );
        }
        const sablon = await StackSablon.findById(doc.stack.sablonId).lean().exec();
        if (!sablon) {
          throw new OrchestratorHiba(
            "SABLON_NINCS",
            "A megadott stack sablon nem található.",
          );
        }
        compose = sablon.composeYaml;
        halozatok = sablon.szuksegesHalozatok;
        helyorzok = sablon.helyorzok;
      }
      const titkosKulcsok = new Set(
        doc.stack.env.filter((e) => e.titkos).map((e) => e.nev),
      );
      const val = ertekek();
      const rendes = renderSablon(compose, val, { helyorzok, titkosKulcsok });
      const maszk = renderSablon(compose, val, {
        helyorzok,
        titkosKulcsok,
        maszkolt: true,
      });
      return {
        compose: rendes.compose,
        maszkolt: maszk.compose,
        hianyzo: rendes.hianyzo,
        halozatok,
      };
    },
    stackKornyezet() {
      return doc.stack.env.map((e) => ({
        name: e.nev,
        value: e.titkos
          ? e.titkosErtek
            ? decryptSecret(e.titkosErtek)
            : ""
          : (e.ertek ?? ""),
      }));
    },
  };
}

async function allapotUjraszamol(id: string): Promise<TelepitesAllapot> {
  const doc = await betolt(id);
  const uj = levezetTelepitesAllapot(
    doc.allapot,
    doc.lepesek.map((l) => ({ kulcs: l.kulcs, allapot: l.allapot })),
  );
  if (uj !== doc.allapot)
    await Telepites.updateOne({ _id: doc._id }, { $set: { allapot: uj } });
  return uj;
}

async function fuggosegekRendben(
  ctx: LepesKontextus,
  kulcs: LepesKulcs,
  felulir: boolean,
): Promise<void> {
  for (const dep of LEPES_DEFINICIOK[kulcs].fuggosegek) {
    const l = lepesAdat(ctx.telepites, dep);
    if (l.allapot === "kesz" || l.allapot === "adoptalva") continue;
    if (
      kulcs === "stack_letrehozas" &&
      dep === "image_epites" &&
      l.allapot === "kihagyva" &&
      ctx.telepites.image.repo &&
      ctx.telepites.image.tag
    ) {
      continue;
    }
    if (l.allapot === "kihagyva") {
      if (felulir) continue;
      const v = await LEPES_REGISZTER[dep].ellenoriz(ctx);
      if (v.ok) continue;
      throw new OrchestratorHiba(
        "FUGGOSEG_KIHAGYVA",
        `A(z) "${dep}" függő lépés ki van hagyva, és az ellenőrzése sikertelen — felülíráshoz külön jogosultság kell.`,
      );
    }
    throw new OrchestratorHiba(
      "FUGGOSEG_NEM_KESZ",
      `A(z) "${dep}" függő lépés még nincs kész (jelenlegi állapot: ${l.allapot}).`,
    );
  }
}

function hibaUzenet(err: unknown): string {
  if (err instanceof IntegrationError) return err.safeMessage;
  if (err instanceof OrchestratorHiba) return err.message;
  return "Ismeretlen hiba történt a lépés végrehajtása közben.";
}

function eredmenyBeallit(r: LepesEredmeny, extraMeta?: Record<string, unknown>) {
  const set: Record<string, unknown> = {
    "lepesek.$.allapot": r.allapot,
    "lepesek.$.befejezve": new Date(),
    "lepesek.$.uzenet": r.uzenet ?? null,
    "lepesek.$.utolsoHiba": null,
  };
  if (r.kulsoId !== undefined) set["lepesek.$.kulsoId"] = r.kulsoId;
  if (r.meta || extraMeta)
    set["lepesek.$.meta"] = { ...(r.meta ?? {}), ...(extraMeta ?? {}) };
  for (const [k, v] of Object.entries(r.kulsoIdkPatch ?? {})) set[`kulsoIdk.${k}`] = v;
  for (const [k, v] of Object.entries(r.telepitesPatch ?? {})) set[k] = v;
  return set;
}

/** Dry-run: only `terv()` runs — no provider mutation, no step state change, one `lepes_terv` event. */
export async function lepesTerv(p: LepesParam): Promise<LepesKimenet<LepesTerv>> {
  const doc = await betolt(p.telepitesId);
  const ctx = kontextus(doc, p.kliensek ?? {}, p.most ?? new Date());
  const terv = await LEPES_REGISZTER[p.lepesKulcs].terv(ctx, p.input);
  await esemenyNaploz({
    telepitesId: p.telepitesId,
    lepesKulcs: p.lepesKulcs,
    tipus: "lepes_terv",
    szereplo: p.szereplo,
    uzenet: terv.osszegzes,
    reszlet: terv,
  });
  return { allapot: doc.allapot, eredmeny: terv };
}

export async function lepesVegrehajt(
  p: LepesParam & { force?: boolean; dryRun?: boolean },
): Promise<LepesKimenet<LepesEredmeny | LepesTerv>> {
  if (p.dryRun) return lepesTerv(p);

  const most = p.most ?? new Date();
  const kezelo = LEPES_REGISZTER[p.lepesKulcs];
  const doc = await betolt(p.telepitesId);
  if (doc.allapot === "archivalt" || doc.allapot === "nyilvantartas") {
    throw new OrchestratorHiba(
      "NEM_FUTTATHATO",
      "Archivált vagy csak nyilvántartott telepítésen nem futtatható lépés.",
    );
  }
  const lepes = lepesAdat(nezetAdat(doc), p.lepesKulcs);
  let ctx = kontextus(doc, p.kliensek ?? {}, most);
  await fuggosegekRendben(
    ctx,
    p.lepesKulcs,
    Boolean(p.szereplo.felulirhat && p.input?.force_dependency_override),
  );

  const kulcs = idempotenciaKulcs(
    p.telepitesId,
    p.lepesKulcs,
    szandek(ctx.telepites, doc),
  );
  const tarolt = doc.lepesek.find((l) => l.kulcs === p.lepesKulcs);

  // Idempotent no-op: finished with an unchanged intent and no explicit force → verify only.
  if (
    !p.force &&
    (lepes.allapot === "kesz" || lepes.allapot === "adoptalva") &&
    tarolt?.meta?.idempotenciaKulcs === kulcs
  ) {
    const v = await kezelo.ellenoriz(ctx);
    return {
      allapot: doc.allapot,
      noop: true,
      eredmeny: { allapot: lepes.allapot, uzenet: v.uzenet, meta: tarolt?.meta ?? {} },
    };
  }

  // One execution per step at a time: claim it with a conditional update. A `fut` step older
  // than the abandon threshold (crashed request) may be reclaimed.
  const hatar = new Date(most.getTime() - LEPES_AKADAS_PERCEK * 60_000);
  const claim = await Telepites.updateOne(
    {
      _id: oid(p.telepitesId),
      lepesek: {
        $elemMatch: {
          kulcs: p.lepesKulcs,
          $or: [{ allapot: { $ne: "fut" } }, { inditva: { $lt: hatar } }],
        },
      },
    },
    {
      $set: {
        "lepesek.$.allapot": "fut",
        "lepesek.$.inditva": most,
        "lepesek.$.utolsoHiba": null,
      },
    },
  );
  if (claim.matchedCount === 0) {
    throw new OrchestratorHiba(
      "LEPES_MAR_FUT",
      "Ez a lépés éppen fut egy másik kérésben.",
    );
  }
  await esemenyNaploz({
    telepitesId: p.telepitesId,
    lepesKulcs: p.lepesKulcs,
    tipus: "lepes_inditas",
    szereplo: p.szereplo,
    uzenet: `"${p.lepesKulcs}" végrehajtása elindult.`,
  });

  const kezdet = Date.now();
  try {
    // Reload: the claim above changed the document and a dependency may have patched ids.
    ctx = kontextus(await betolt(p.telepitesId), p.kliensek ?? {}, most);
    const r = await kezelo.vegrehajt(ctx, p.input);
    await Telepites.updateOne(
      { _id: oid(p.telepitesId), "lepesek.kulcs": p.lepesKulcs },
      { $set: eredmenyBeallit(r, { idempotenciaKulcs: kulcs }) },
    );
    await esemenyNaploz({
      telepitesId: p.telepitesId,
      lepesKulcs: p.lepesKulcs,
      tipus: "lepes_ok",
      szereplo: p.szereplo,
      uzenet: r.uzenet ?? `"${p.lepesKulcs}" sikeresen lefutott.`,
      reszlet: r,
      idotartamMs: Date.now() - kezdet,
    });
    return { allapot: await allapotUjraszamol(p.telepitesId), eredmeny: r };
  } catch (err) {
    const uzenet = hibaUzenet(err);
    await Telepites.updateOne(
      { _id: oid(p.telepitesId), "lepesek.kulcs": p.lepesKulcs },
      {
        $set: {
          "lepesek.$.allapot": "hibas",
          "lepesek.$.befejezve": new Date(),
          "lepesek.$.utolsoHiba": uzenet,
        },
      },
    );
    await esemenyNaploz({
      telepitesId: p.telepitesId,
      lepesKulcs: p.lepesKulcs,
      tipus: "lepes_hiba",
      szereplo: p.szereplo,
      uzenet,
      reszlet: {
        tipus: err instanceof Error ? err.name : "Error",
        kod:
          err instanceof IntegrationError
            ? err.code
            : err instanceof OrchestratorHiba
              ? err.kod
              : undefined,
      },
      idotartamMs: Date.now() - kezdet,
    });
    await allapotUjraszamol(p.telepitesId);
    throw err;
  }
}

export async function lepesAdoptal(
  p: LepesParam & { kulsoId: string },
): Promise<LepesKimenet<LepesEredmeny>> {
  const doc = await betolt(p.telepitesId);
  const ctx = kontextus(doc, p.kliensek ?? {}, p.most ?? new Date());
  const r = await LEPES_REGISZTER[p.lepesKulcs].adoptal(ctx, {
    ...p.input,
    kulsoId: p.kulsoId,
  });
  await Telepites.updateOne(
    { _id: oid(p.telepitesId), "lepesek.kulcs": p.lepesKulcs },
    { $set: eredmenyBeallit(r) },
  );
  await esemenyNaploz({
    telepitesId: p.telepitesId,
    lepesKulcs: p.lepesKulcs,
    tipus: "lepes_adopt",
    szereplo: p.szereplo,
    uzenet: r.uzenet ?? "Erőforrás adoptálva.",
    reszlet: r,
  });
  return { allapot: await allapotUjraszamol(p.telepitesId), eredmeny: r };
}

export async function lepesEllenoriz(
  p: LepesParam,
): Promise<LepesKimenet<LepesEllenorzes>> {
  const doc = await betolt(p.telepitesId);
  const ctx = kontextus(doc, p.kliensek ?? {}, p.most ?? new Date());
  const lepes = lepesAdat(ctx.telepites, p.lepesKulcs);
  const v = await LEPES_REGISZTER[p.lepesKulcs].ellenoriz(ctx);
  // State machine: manual_required --verify ok--> done.
  if (v.ok && lepes.allapot === "kezi") {
    await Telepites.updateOne(
      { _id: oid(p.telepitesId), "lepesek.kulcs": p.lepesKulcs },
      {
        $set: {
          "lepesek.$.allapot": "kesz",
          "lepesek.$.befejezve": new Date(),
          "lepesek.$.uzenet": v.uzenet,
        },
      },
    );
  }
  await esemenyNaploz({
    telepitesId: p.telepitesId,
    lepesKulcs: p.lepesKulcs,
    tipus: "lepes_ellenorzes",
    szereplo: p.szereplo,
    uzenet: v.uzenet,
    reszlet: v,
  });
  return { allapot: await allapotUjraszamol(p.telepitesId), eredmeny: v };
}

export async function lepesKihagy(
  p: LepesParam & { ok?: string },
): Promise<LepesKimenet<{ ok: true }>> {
  if (!LEPES_DEFINICIOK[p.lepesKulcs].kihagyhato) {
    throw new OrchestratorHiba(
      "LEPES_NEM_KIHAGYHATO",
      `A(z) "${p.lepesKulcs}" lépés nem hagyható ki.`,
    );
  }
  const ok = p.ok?.trim() || undefined;
  // Only an idle step can be skipped — never one that is running or already done.
  const r = await Telepites.updateOne(
    {
      _id: oid(p.telepitesId),
      lepesek: {
        $elemMatch: { kulcs: p.lepesKulcs, allapot: { $in: ["fuggo", "hibas", "kezi"] } },
      },
    },
    {
      $set: {
        "lepesek.$.allapot": "kihagyva",
        "lepesek.$.uzenet": ok ?? null,
        "lepesek.$.befejezve": new Date(),
      },
    },
  );
  if (r.matchedCount === 0) {
    throw new OrchestratorHiba(
      "LEPES_NEM_KIHAGYHATO",
      "Ez a lépés most nem hagyható ki.",
    );
  }
  await esemenyNaploz({
    telepitesId: p.telepitesId,
    lepesKulcs: p.lepesKulcs,
    tipus: "lepes_kihagy",
    szereplo: p.szereplo,
    uzenet: ok ?? `"${p.lepesKulcs}" kihagyva.`,
  });
  return { allapot: await allapotUjraszamol(p.telepitesId), eredmeny: { ok: true } };
}

export async function lepesVisszaallit(
  p: LepesParam,
): Promise<LepesKimenet<{ ok: true }>> {
  const r = await Telepites.updateOne(
    {
      _id: oid(p.telepitesId),
      lepesek: { $elemMatch: { kulcs: p.lepesKulcs, allapot: "kihagyva" } },
    },
    {
      $set: {
        "lepesek.$.allapot": "fuggo",
        "lepesek.$.uzenet": null,
        "lepesek.$.befejezve": null,
      },
    },
  );
  if (r.matchedCount > 0) {
    await esemenyNaploz({
      telepitesId: p.telepitesId,
      lepesKulcs: p.lepesKulcs,
      tipus: "lepes_visszaallit",
      szereplo: p.szereplo,
      uzenet: `"${p.lepesKulcs}" kihagyása visszavonva.`,
    });
  }
  return { allapot: await allapotUjraszamol(p.telepitesId), eredmeny: { ok: true } };
}

/** Runs pending/failed steps in pipeline order until one blocks (error or manual action). */
export async function kovetkezoLepesek(
  p: Omit<LepesParam, "lepesKulcs" | "input"> & { maxLepes?: number },
): Promise<LepesKimenet<{ lefutott: LepesKulcs[]; akadaly: LepesKulcs | null }>> {
  const lefutott: LepesKulcs[] = [];
  let akadaly: LepesKulcs | null = null;
  let doc = await betolt(p.telepitesId);
  for (const l of doc.lepesek) {
    if (lefutott.length >= (p.maxLepes ?? doc.lepesek.length)) break;
    if (l.allapot !== "fuggo" && l.allapot !== "hibas") continue;
    try {
      const k = await lepesVegrehajt({ ...p, lepesKulcs: l.kulcs });
      lefutott.push(l.kulcs);
      // A manual step (NS delegation) stops the run: someone has to act first.
      if ((k.eredmeny as LepesEredmeny).allapot === "kezi") {
        akadaly = l.kulcs;
        break;
      }
    } catch {
      akadaly = l.kulcs;
      break;
    }
  }
  doc = await betolt(p.telepitesId);
  return { allapot: doc.allapot, eredmeny: { lefutott, akadaly } };
}
