/**
 * Integration connections (Cloudflare, NPM, Portainer).
 *
 * Credentials are encrypted with the shared AES-256-GCM helper (`@erp/lib`, same key as the
 * Titoktár) before they touch the database and are NEVER returned: list/get expose only the
 * names of the stored fields. Plaintext exists only inside `kliensek.ts` while a client is built.
 */
import { connectDB } from "@erp/db-core";
import { decryptSecret, encryptSecret } from "@erp/lib/utils";
import { INTEGRACIO_HITELESITO_MEZOK, type IntegracioSzolgaltato } from "./constants";
import { IntegracioKapcsolat, type IIntegracioKapcsolat } from "./models";
import {
  alapKliensGyar,
  egeszsegEllenorzes,
  kapcsolatAdat,
  type KliensGyar,
} from "./kliensek";
import { kliensCacheTorol } from "./kontextus";
import {
  duplikalt,
  elsoHiba,
  hiba,
  iso,
  ok,
  oid,
  validId,
  type InfraResult,
} from "./shared";
import { integracioSchema, type IntegracioInput } from "./validation";

// ----------------------------------------------------------------- IntegracioKapcsolat

export type IntegracioDetail = {
  _id: string;
  szolgaltato: string;
  cimke: string;
  alapUrl: string;
  aktiv: boolean;
  hitelesitoMezok: string[];
  utolsoEllenorzes?: string;
  utolsoEllenorzesOk?: boolean;
  utolsoEllenorzesUzenet?: string;
  id: string;
  allowInsecureTls: boolean;
  accountId?: string;
  endpointId?: number;
};

function hitelesitoMezok(
  row: Pick<IIntegracioKapcsolat, "hitelesitoTitkositott">,
): string[] {
  try {
    return Object.entries(
      JSON.parse(decryptSecret(row.hitelesitoTitkositott)) as Record<string, string>,
    )
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  } catch {
    return []; // wrong key / corrupt payload — list still works, nothing is revealed
  }
}

/** The one place a row becomes a DTO: field names only, never the payload or the values. */
function toIntegracio(r: IIntegracioKapcsolat): IntegracioDetail {
  return {
    _id: String(r._id),
    id: String(r._id),
    szolgaltato: r.szolgaltato,
    cimke: r.cimke,
    alapUrl: r.alapUrl,
    aktiv: r.aktiv,
    hitelesitoMezok: hitelesitoMezok(r),
    utolsoEllenorzes: iso(r.utolsoEllenorzes),
    utolsoEllenorzesOk: r.utolsoEllenorzesOk,
    utolsoEllenorzesUzenet: r.utolsoEllenorzesUzenet,
    allowInsecureTls: r.meta?.allow_insecure_tls === true,
    accountId: r.meta?.account_id as string | undefined,
    endpointId: r.meta?.endpoint_id as number | undefined,
  };
}

function metaOf(
  i: Pick<IntegracioInput, "allowInsecureTls" | "accountId" | "endpointId">,
) {
  const meta: Record<string, unknown> = {};
  if (i.allowInsecureTls) meta.allow_insecure_tls = true;
  if (i.accountId) meta.account_id = i.accountId;
  if (i.endpointId !== undefined) meta.endpoint_id = i.endpointId;
  return meta;
}

export const integracioApi = {
  async listIntegraciok(): Promise<IntegracioDetail[]> {
    await connectDB();
    const rows = await IntegracioKapcsolat.find()
      .sort({ szolgaltato: 1, cimke: 1 })
      .exec();
    return rows.map(toIntegracio);
  },

  async getIntegracio(id: string): Promise<IntegracioDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const r = await IntegracioKapcsolat.findById(id).exec();
    return r ? toIntegracio(r) : null;
  },

  async createIntegracio(input: IntegracioInput, actorId: string): Promise<InfraResult> {
    const p = integracioSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    const hianyzo = INTEGRACIO_HITELESITO_MEZOK[p.data.szolgaltato].filter(
      (m: string) => !p.data.hitelesito[m],
    );
    if (hianyzo.length > 0)
      return hiba(`Hiányzó hitelesítő mező: ${hianyzo.join(", ")}.`);
    await connectDB();
    try {
      const doc = await IntegracioKapcsolat.create({
        szolgaltato: p.data.szolgaltato,
        cimke: p.data.cimke,
        alapUrl: p.data.alapUrl,
        hitelesitoTitkositott: encryptSecret(JSON.stringify(p.data.hitelesito)),
        meta: metaOf(p.data),
        aktiv: p.data.aktiv ?? true,
        letrehozoId: actorId,
      });
      kliensCacheTorol();
      return ok(String(doc._id));
    } catch (err) {
      if (duplikalt(err))
        return hiba("Ilyen címkével már van kapcsolat ennél a szolgáltatónál.");
      throw err;
    }
  },

  /** Blank credential fields keep the stored value; filled ones replace it. */
  async updateIntegracio(id: string, input: IntegracioInput): Promise<InfraResult> {
    if (!validId(id)) return hiba("A kapcsolat nem található.");
    const p = integracioSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const doc = await IntegracioKapcsolat.findById(id).exec();
    if (!doc) return hiba("A kapcsolat nem található.");
    const regi = JSON.parse(decryptSecret(doc.hitelesitoTitkositott)) as Record<
      string,
      string
    >;
    const uj: Record<string, string> = { ...regi };
    for (const [k, v] of Object.entries(p.data.hitelesito)) if (v) uj[k] = v;
    doc.cimke = p.data.cimke;
    doc.alapUrl = p.data.alapUrl;
    doc.hitelesitoTitkositott = encryptSecret(JSON.stringify(uj));
    doc.meta = metaOf(p.data);
    doc.aktiv = p.data.aktiv ?? doc.aktiv;
    try {
      await doc.save();
    } catch (err) {
      if (duplikalt(err))
        return hiba("Ilyen címkével már van kapcsolat ennél a szolgáltatónál.");
      throw err;
    }
    kliensCacheTorol();
    return ok(id);
  },

  async deleteIntegracio(id: string): Promise<InfraResult> {
    if (!validId(id)) return hiba("A kapcsolat nem található.");
    await connectDB();
    const r = await IntegracioKapcsolat.deleteOne({ _id: oid(id) }).exec();
    kliensCacheTorol();
    return r.deletedCount === 0 ? hiba("A kapcsolat nem található.") : ok(id);
  },

  /** The "Teszt" button: decrypt, build the client, probe the provider, store the outcome. */
  async tesztIntegracio(
    id: string,
    gyar: KliensGyar = alapKliensGyar,
  ): Promise<InfraResult<{ uzenet: string; sikeres: boolean }>> {
    if (!validId(id)) return hiba("A kapcsolat nem található.");
    await connectDB();
    const doc = await IntegracioKapcsolat.findById(id).exec();
    if (!doc) return hiba("A kapcsolat nem található.");
    let eredmeny: { ok: boolean; uzenet: string };
    try {
      eredmeny = await egeszsegEllenorzes(
        doc.szolgaltato as IntegracioSzolgaltato,
        gyar(kapcsolatAdat(doc)),
      );
    } catch {
      eredmeny = {
        ok: false,
        uzenet: "A hitelesítő adatok nem olvashatók (titkosítási kulcs?).",
      };
    }
    await IntegracioKapcsolat.updateOne(
      { _id: doc._id },
      {
        $set: {
          utolsoEllenorzes: new Date(),
          utolsoEllenorzesOk: eredmeny.ok,
          utolsoEllenorzesUzenet: eredmeny.uzenet,
        },
      },
    );
    return ok(id, { uzenet: eredmeny.uzenet, sikeres: eredmeny.ok });
  },
};
