/**
 * Stacks: the Portainer stacks the operator manages. Portainer is read LIVE (containers, compose,
 * env); Mongo only holds type / partner / notes. No permission checks here.
 */
import { connectDB } from "@erp/db-core";
import type { ContainerSummary, PortainerStack } from "@erp/integrations";
import { parseDocument } from "yaml";
import { STACK_TIPUSOK, type EsemenyCelTipus, type StackTipus } from "./constants";
import { InfraOldal, InfraStack, type IInfraStack } from "./models";
import { kliensek } from "./kontextus";
import { szuksegesKliens, type PortainerPort } from "./kliensek";
import { naplo } from "./esemeny";
import {
  InfraHiba,
  hiba,
  hibaSzoveg,
  iso,
  ok,
  oid,
  validId,
  type InfraResult,
  type Szereplo,
} from "./shared";
import {
  STACK_NEV_RE,
  composeElemez,
  imageRovid,
  stackAllapot,
  stackTipusTipp,
} from "./szabalyok";
import type {
  KonteinerSor,
  OldalRovid,
  StackDetail,
  StackFajl,
  StackSor,
  SzinkronEredmeny,
} from "./tipusok";

// ------------------------------------------------------------------ live loading

export type EloAdat = {
  stackek: PortainerStack[];
  konteinerek: ContainerSummary[];
};

export async function eloBetolt(p: PortainerPort): Promise<EloAdat> {
  const [stackek, konteinerek] = await Promise.all([p.listStacks(), p.listContainers()]);
  return { stackek, konteinerek };
}

/** Portainer puts the stack id in the compose working dir: `/data/compose/<stackId>`. */
export function konteinerStackId(
  c: ContainerSummary,
  stackek: PortainerStack[],
): number | null {
  const wd = c.Labels?.["com.docker.compose.project.working_dir"];
  const m = wd?.match(/compose\/(\d+)/);
  if (m) {
    const id = Number(m[1]);
    if (stackek.some((s) => s.Id === id)) return id;
  }
  const proj = c.Labels?.["com.docker.compose.project"];
  if (proj) {
    const s = stackek.find((x) => x.Name.toLowerCase() === proj.toLowerCase());
    if (s) return s.Id;
  }
  return null;
}

export function toKonteiner(c: ContainerSummary): KonteinerSor {
  return {
    id: c.Id,
    nev: (c.Names[0] ?? c.Id.slice(0, 12)).replace(/^\//, ""),
    szolgaltatas: c.Labels?.["com.docker.compose.service"],
    image: c.Image ?? "?",
    imageId: c.ImageID,
    allapot: c.State ?? "ismeretlen",
    statusz: c.Status,
    letrehozva: c.Created ? new Date(c.Created * 1000).toISOString() : undefined,
    portok: (c.Ports ?? [])
      .filter((p) => p.PrivatePort)
      .map((p) =>
        p.PublicPort ? `${p.PublicPort}→${p.PrivatePort}` : `${p.PrivatePort}`,
      ),
  };
}

export function csoportosit(elo: EloAdat): {
  stackenkent: Map<number, KonteinerSor[]>;
  arva: KonteinerSor[];
} {
  const stackenkent = new Map<number, KonteinerSor[]>();
  const arva: KonteinerSor[] = [];
  for (const c of elo.konteinerek) {
    const sid = konteinerStackId(c, elo.stackek);
    const sor = toKonteiner(c);
    if (sid === null) arva.push(sor);
    else stackenkent.set(sid, [...(stackenkent.get(sid) ?? []), sor]);
  }
  return { stackenkent, arva };
}

// ------------------------------------------------------------------ sync (stacks only)

/** Mirrors the Portainer stack list into Mongo: new rows, renamed rows, vanished rows. */
export async function stackSzinkron(
  elo: EloAdat,
  endpointId?: number,
): Promise<{ uj: number; elveszett: number; sorok: IInfraStack[] }> {
  await connectDB();
  // Best effort: make sure the unique index exists before writing (slow on some servers).
  await InfraStack.init().catch(() => undefined);
  const sorok = await InfraStack.find().exec();
  const most = new Date();
  let uj = 0;
  let elveszett = 0;
  for (const ps of elo.stackek) {
    const sor = sorok.find((r) => r.portainerStackId === ps.Id);
    if (sor) {
      if (
        sor.nev !== ps.Name ||
        sor.elveszett ||
        (endpointId !== undefined && sor.endpointId !== endpointId)
      ) {
        sor.nev = ps.Name;
        sor.elveszett = false;
        if (endpointId !== undefined) sor.endpointId = endpointId;
        sor.utolsoSzinkron = most;
        await sor.save();
      }
    } else {
      // Atomic: two syncs racing (UI + CLI) must never create the same stack twice.
      const r = await InfraStack.findOneAndUpdate(
        { portainerStackId: ps.Id },
        {
          $setOnInsert: {
            nev: ps.Name,
            tipus: stackTipusTipp(ps.Name),
            elveszett: false,
          },
          $set: { endpointId: endpointId ?? ps.EndpointId, utolsoSzinkron: most },
        },
        { upsert: true, new: true, includeResultMetadata: true },
      );
      if (r.value) sorok.push(r.value);
      if (r.lastErrorObject?.updatedExisting === false) uj += 1;
    }
  }
  const ids = new Set(elo.stackek.map((s) => s.Id));
  for (const sor of sorok) {
    if (!ids.has(sor.portainerStackId) && !sor.elveszett) {
      sor.elveszett = true;
      await sor.save();
      elveszett += 1;
    }
  }
  return { uj, elveszett, sorok };
}

// ------------------------------------------------------------------ DTOs

function toSor(
  r: IInfraStack,
  konteynerek: KonteinerSor[],
  oldalSzam: number,
  partnerNevek?: Map<string, string>,
): StackSor {
  return {
    id: String(r._id),
    portainerId: r.portainerStackId,
    nev: r.nev,
    tipus: r.tipus,
    allapot: stackAllapot(
      konteynerek.map((k) => ({ nev: k.nev, state: k.allapot })),
      r.elveszett,
    ),
    konteneriSzam: konteynerek.length,
    futoSzam: konteynerek.filter((k) => k.allapot === "running").length,
    imagek: [...new Set(konteynerek.map((k) => imageRovid(k.image)))],
    oldalSzam,
    partnerId: r.partnerId,
    partnerNev: r.partnerId ? partnerNevek?.get(r.partnerId) : undefined,
    leiras: r.leiras,
  };
}

async function oldalSzamok(): Promise<Map<string, number>> {
  const rows = await InfraOldal.aggregate<{ _id: string; n: number }>([
    { $match: { stackId: { $exists: true, $ne: null } } },
    { $group: { _id: "$stackId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

async function sorBetolt(id: string): Promise<IInfraStack> {
  if (!validId(id)) throw new InfraHiba("A stack nem található.");
  await connectDB();
  const r = await InfraStack.findById(id).exec();
  if (!r) throw new InfraHiba("A stack nem található.");
  return r;
}

function elveszettTiltas(r: IInfraStack): void {
  if (r.elveszett)
    throw new InfraHiba(
      "Ez a stack már nem létezik a Portaineren — csak törölhető a nyilvántartásból.",
    );
}

/** Wraps an operation: audit event on success and failure, user-safe error text. */
export async function futtat<T extends object>(
  cel: { celTipus: EsemenyCelTipus; celId?: string; celNev?: string },
  muvelet: Parameters<typeof naplo>[0]["muvelet"],
  szereplo: Szereplo,
  fn: () => Promise<{ uzenet?: string; reszletek?: Record<string, unknown>; extra?: T }>,
): Promise<InfraResult<T & { uzenet?: string }>> {
  try {
    const r = await fn();
    await naplo({
      ...cel,
      muvelet,
      ok: true,
      uzenet: r.uzenet,
      reszletek: r.reszletek,
      szereplo,
    });
    return ok(cel.celId, { ...(r.extra ?? ({} as T)), uzenet: r.uzenet });
  } catch (err) {
    const uzenet = hibaSzoveg(err);
    await naplo({ ...cel, muvelet, ok: false, uzenet, szereplo });
    return hiba(uzenet);
  }
}

// ------------------------------------------------------------------ facade

export type PartnerNevek = Map<string, string>;

export const stackApi = {
  /** Lists the stacks (auto-syncs new/vanished ones from Portainer first). */
  async listStackek(
    opts: { partnerNevek?: PartnerNevek } = {},
  ): Promise<{ stackek: StackSor[]; arva: KonteinerSor[] }> {
    const k = await kliensek();
    const p = szuksegesKliens(k, "portainer");
    const elo = await eloBetolt(p);
    const { sorok } = await stackSzinkron(elo);
    const { stackenkent, arva } = csoportosit(elo);
    const osszegek = await oldalSzamok();
    const stackek = sorok
      .map((r) =>
        toSor(
          r,
          stackenkent.get(r.portainerStackId) ?? [],
          osszegek.get(String(r._id)) ?? 0,
          opts.partnerNevek,
        ),
      )
      .sort((a, b) => a.nev.localeCompare(b.nev, "hu"));
    return { stackek, arva };
  },

  /** For the "new site" form: every stack with the containers (services) a site can point at. */
  async listStackSzolgaltatasok(): Promise<
    Array<{
      id: string;
      nev: string;
      partnerId?: string;
      szolgaltatasok: Array<{ nev: string; allapot: string; portok: string[] }>;
    }>
  > {
    const p = szuksegesKliens(await kliensek(), "portainer");
    const elo = await eloBetolt(p);
    const { sorok } = await stackSzinkron(elo);
    const { stackenkent } = csoportosit(elo);
    return sorok
      .filter((r) => !r.elveszett)
      .map((r) => ({
        id: String(r._id),
        nev: r.nev,
        partnerId: r.partnerId,
        szolgaltatasok: (stackenkent.get(r.portainerStackId) ?? [])
          .map((k) => ({ nev: k.nev, allapot: k.allapot, portok: k.portok }))
          .sort((a, b) => a.nev.localeCompare(b.nev)),
      }))
      .sort((a, b) => a.nev.localeCompare(b.nev, "hu"));
  },

  async getStack(
    id: string,
    opts: { partnerNevek?: PartnerNevek } = {},
  ): Promise<StackDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const r = await InfraStack.findById(id).exec();
    if (!r) return null;
    const k = await kliensek();
    const p = szuksegesKliens(k, "portainer");
    const elo = await eloBetolt(p);
    const { stackenkent } = csoportosit(elo);
    const konteynerek = (stackenkent.get(r.portainerStackId) ?? []).sort((a, b) =>
      a.nev.localeCompare(b.nev),
    );
    const oldalak = await InfraOldal.find({ stackId: id }).sort({ nev: 1 }).lean().exec();
    const ps = elo.stackek.find((s) => s.Id === r.portainerStackId);
    const osszegek = await oldalSzamok();
    const rovid: OldalRovid[] = oldalak.map((o) => ({
      id: String(o._id),
      nev: o.nev,
      hostnevek: o.hostnevek,
      szolgaltatas: o.szolgaltatas,
      port: o.port,
      partnerId: o.partnerId,
      partnerNev: o.partnerId ? opts.partnerNevek?.get(o.partnerId) : undefined,
    }));
    return {
      ...toSor(r, konteynerek, osszegek.get(id) ?? 0, opts.partnerNevek),
      konteynerek,
      oldalak: rovid,
      frissitve: ps?.UpdateDate
        ? new Date(ps.UpdateDate * 1000).toISOString()
        : undefined,
      letrehozva: ps?.CreationDate
        ? new Date(ps.CreationDate * 1000).toISOString()
        : undefined,
      endpointId: r.endpointId,
      webhook: Boolean(ps?.AutoUpdate?.Webhook),
    };
  },

  /** Compose text + env values — contains secrets; gate it on the write permission. */
  async getStackFajl(id: string): Promise<StackFajl> {
    const r = await sorBetolt(id);
    elveszettTiltas(r);
    const p = szuksegesKliens(await kliensek(), "portainer");
    const [compose, ps] = await Promise.all([
      p.getStackFile(r.portainerStackId),
      p.getStack(r.portainerStackId),
    ]);
    return {
      compose,
      env: (ps.Env ?? []).map((e) => ({ name: e.name, value: e.value })),
    };
  },

  /** Type / partner / notes only (DB). */
  async stackModosit(
    id: string,
    mezok: { tipus?: StackTipus; partnerId?: string | null; leiras?: string },
  ): Promise<InfraResult> {
    if (mezok.tipus && !STACK_TIPUSOK.includes(mezok.tipus))
      return hiba("Érvénytelen típus.");
    const r = await InfraStack.findById(
      validId(id) ? id : "000000000000000000000000",
    ).exec();
    if (!r) return hiba("A stack nem található.");
    if (mezok.tipus) r.tipus = mezok.tipus;
    if (mezok.partnerId !== undefined) r.partnerId = mezok.partnerId ?? undefined;
    if (mezok.leiras !== undefined) r.leiras = mezok.leiras || undefined;
    await r.save();
    return ok(id);
  },

  /** "Image frissítés": pull every image of the stack and recreate the changed containers. */
  async frissitStack(id: string, szereplo: Szereplo) {
    const r = await sorBetolt(id).catch(() => null);
    if (!r) return hiba("A stack nem található.");
    return futtat(
      { celTipus: "stack", celId: id, celNev: r.nev },
      "stack.frissit",
      szereplo,
      async () => {
        elveszettTiltas(r);
        const p = szuksegesKliens(await kliensek(), "portainer");
        const [elotte, compose, ps] = await Promise.all([
          p
            .listContainers({
              label: [
                `com.docker.compose.project.working_dir=/data/compose/${r.portainerStackId}`,
              ],
            })
            .catch(() => []),
          p.getStackFile(r.portainerStackId),
          p.getStack(r.portainerStackId),
        ]);
        await p.updateStack(
          r.portainerStackId,
          compose,
          (ps.Env ?? []).map((e) => ({ name: e.name, value: e.value })),
          { pullImage: true },
        );
        const utana = await p
          .listContainers({
            label: [
              `com.docker.compose.project.working_dir=/data/compose/${r.portainerStackId}`,
            ],
          })
          .catch(() => []);
        const regi = new Map(
          elotte.map((c) => [(c.Names[0] ?? c.Id).replace(/^\//, ""), c.ImageID]),
        );
        const frissult = utana
          .map((c) => (c.Names[0] ?? c.Id).replace(/^\//, ""))
          .filter(
            (n) =>
              regi.get(n) !==
              utana.find((c) => (c.Names[0] ?? c.Id).replace(/^\//, "") === n)?.ImageID,
          );
        return {
          uzenet: frissult.length
            ? `Frissült: ${frissult.join(", ")}.`
            : "Nem volt újabb image — a konténerek változatlanok maradtak.",
          reszletek: { frissult },
          extra: { frissult },
        };
      },
    );
  },

  /** Saves compose and/or env and redeploys. `pull` additionally pulls fresh images. */
  async mentesStack(
    id: string,
    bemenet: {
      compose?: string;
      env?: Array<{ name: string; value: string }>;
      pull?: boolean;
    },
    szereplo: Szereplo,
  ) {
    const r = await sorBetolt(id).catch(() => null);
    if (!r) return hiba("A stack nem található.");
    return futtat(
      { celTipus: "stack", celId: id, celNev: r.nev },
      "stack.mentes",
      szereplo,
      async () => {
        elveszettTiltas(r);
        const p = szuksegesKliens(await kliensek(), "portainer");
        const regiCompose = await p.getStackFile(r.portainerStackId);
        const ps = await p.getStack(r.portainerStackId);
        const compose = bemenet.compose ?? regiCompose;
        const el = composeElemez(compose);
        if (!el.ok) throw new InfraHiba(el.hiba);
        const env =
          bemenet.env ?? (ps.Env ?? []).map((e) => ({ name: e.name, value: e.value }));
        for (const e of env) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.name))
            throw new InfraHiba(`Érvénytelen környezeti változó neve: "${e.name}".`);
        }
        const regi = composeElemez(regiCompose);
        const regiImagek = new Map(
          regi.ok ? regi.szolgaltatasok.map((s) => [s.nev, s.image]) : [],
        );
        const valtozas = el.szolgaltatasok
          .filter((s) => regiImagek.get(s.nev) !== s.image)
          .map((s) => `${s.nev}: ${regiImagek.get(s.nev) ?? "(új)"} → ${s.image}`);
        await p.updateStack(r.portainerStackId, compose, env, {
          pullImage: bemenet.pull ?? false,
        });
        return {
          uzenet: "A stack mentve és újratelepítve.",
          reszletek: {
            szolgaltatasok: el.szolgaltatasok.map((s) => s.nev),
            imageValtozas: valtozas,
            envDb: env.length,
          },
        };
      },
    );
  },

  /** Resolves a user/agent reference — Mongo id, Portainer id or (unique) name — to the stack id. */
  async stackAzonosit(ref: string): Promise<string> {
    await connectDB();
    const kulcs = ref.trim();
    if (validId(kulcs)) {
      const r = await InfraStack.findById(kulcs).select("_id").lean().exec();
      if (r) return String(r._id);
    }
    if (/^\d+$/.test(kulcs)) {
      const r = await InfraStack.findOne({ portainerStackId: Number(kulcs) })
        .select("_id")
        .lean()
        .exec();
      if (r) return String(r._id);
    }
    const nevek = await InfraStack.find({ nev: kulcs })
      .select("_id portainerStackId")
      .lean()
      .exec();
    if (nevek.length === 1) return String(nevek[0]!._id);
    if (nevek.length > 1)
      throw new InfraHiba(
        `Több „${kulcs}” nevű stack van (Portainer id: ${nevek.map((n) => n.portainerStackId).join(", ")}) — add meg az azonosítót.`,
      );
    throw new InfraHiba(`Nincs „${kulcs}” stack — futtass egy szinkront?`);
  },

  /** Sets the image of one compose service, keeping comments and formatting; then redeploys. */
  async imageBeallit(
    id: string,
    szolgaltatas: string,
    image: string,
    opts: { pull?: boolean },
    szereplo: Szereplo,
  ) {
    try {
      const r = await sorBetolt(id);
      const p = szuksegesKliens(await kliensek(), "portainer");
      const doc = parseDocument(await p.getStackFile(r.portainerStackId));
      if (!doc.hasIn(["services", szolgaltatas]))
        throw new InfraHiba(`Nincs „${szolgaltatas}” szolgáltatás a compose fájlban.`);
      if (!/^[^\s]+$/.test(image)) throw new InfraHiba("Érvénytelen image név.");
      doc.setIn(["services", szolgaltatas, "image"], image);
      return stackApi.mentesStack(
        id,
        { compose: String(doc), pull: opts.pull ?? true },
        szereplo,
      );
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  /** Sets (value) or removes (`null`) one Portainer env variable of the stack, then redeploys. */
  async envBeallit(id: string, nev: string, ertek: string | null, szereplo: Szereplo) {
    try {
      await sorBetolt(id);
      const { env } = await stackApi.getStackFajl(id);
      const maradek = env.filter((e) => e.name !== nev);
      if (ertek !== null) maradek.push({ name: nev, value: ertek });
      return stackApi.mentesStack(id, { env: maradek }, szereplo);
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  async inditStack(id: string, szereplo: Szereplo) {
    return stackAllapotValtas(id, "start", szereplo);
  },
  async leallitStack(id: string, szereplo: Szereplo) {
    return stackAllapotValtas(id, "stop", szereplo);
  },

  /** Restart one container of a stack (by id or name). */
  async konteinerUjraindit(id: string, konteiner: string, szereplo: Szereplo) {
    const r = await sorBetolt(id).catch(() => null);
    if (!r) return hiba("A stack nem található.");
    return futtat(
      { celTipus: "stack", celId: id, celNev: r.nev },
      "konteiner.ujraindit",
      szereplo,
      async () => {
        const p = szuksegesKliens(await kliensek(), "portainer");
        const c = await konteinerKeres(p, r, konteiner);
        await p.containerAction(c.id, "restart");
        return { uzenet: `„${c.nev}” újraindítva.`, reszletek: { konteiner: c.nev } };
      },
    );
  },

  async konteinerInditas(id: string, konteiner: string, szereplo: Szereplo) {
    return konteinerAllit(id, konteiner, "start", szereplo);
  },

  async konteinerLeallitas(id: string, konteiner: string, szereplo: Szereplo) {
    return konteinerAllit(id, konteiner, "stop", szereplo);
  },

  /**
   * Pulls the image of ONE service and recreates only that service: compose `up -d` leaves
   * containers whose image did not change alone, so a pull + plain redeploy touches just it.
   */
  async konteinerFrissit(id: string, konteiner: string, szereplo: Szereplo) {
    const r = await sorBetolt(id).catch(() => null);
    if (!r) return hiba("A stack nem található.");
    return futtat(
      { celTipus: "stack", celId: id, celNev: r.nev },
      "konteiner.frissit",
      szereplo,
      async () => {
        elveszettTiltas(r);
        const p = szuksegesKliens(await kliensek(), "portainer");
        const c = await konteinerKeres(p, r, konteiner);
        const kep = c.image;
        const filter = {
          label: [
            `com.docker.compose.project.working_dir=/data/compose/${r.portainerStackId}`,
          ],
        };
        const elotte = (await p.listContainers(filter)).find(
          (x) => (x.Names[0] ?? x.Id).replace(/^\//, "") === c.nev,
        );
        await p.pullImage(kep);
        const [compose, ps] = await Promise.all([
          p.getStackFile(r.portainerStackId),
          p.getStack(r.portainerStackId),
        ]);
        await p.updateStack(
          r.portainerStackId,
          compose,
          (ps.Env ?? []).map((e) => ({ name: e.name, value: e.value })),
          { pullImage: false },
        );
        const utana = (await p.listContainers(filter)).find(
          (x) => (x.Names[0] ?? x.Id).replace(/^\//, "") === c.nev,
        );
        const valtozott = !!elotte && !!utana && elotte.ImageID !== utana.ImageID;
        return {
          uzenet: valtozott
            ? `„${c.nev}” frissült az újabb image-re.`
            : `„${c.nev}”: nincs újabb image (${kep}), a konténer változatlan.`,
          reszletek: { konteiner: c.nev, image: kep, valtozott },
          extra: { valtozott },
        };
      },
    );
  },

  async stackNaplo(id: string, konteiner: string, tail = 200): Promise<string> {
    const r = await sorBetolt(id);
    const p = szuksegesKliens(await kliensek(), "portainer");
    const c = await konteinerKeres(p, r, konteiner);
    return p.getContainerLogs(c.id, Math.min(Math.max(tail, 1), 2000));
  },

  async ujStack(
    bemenet: {
      nev: string;
      compose: string;
      env?: Array<{ name: string; value: string }>;
      tipus?: StackTipus;
      partnerId?: string;
      leiras?: string;
    },
    szereplo: Szereplo,
  ) {
    return futtat(
      { celTipus: "stack", celNev: bemenet.nev },
      "stack.letrehoz",
      szereplo,
      async () => {
        const nev = bemenet.nev.trim();
        if (!STACK_NEV_RE.test(nev))
          throw new InfraHiba(
            "A stack neve csak kisbetűt, számot, kötőjelet és alávonást tartalmazhat.",
          );
        const el = composeElemez(bemenet.compose);
        if (!el.ok) throw new InfraHiba(el.hiba);
        const p = szuksegesKliens(await kliensek(), "portainer");
        const letezo = (await p.listStacks()).find((s) => s.Name === nev);
        if (letezo) throw new InfraHiba(`Már van „${nev}” nevű stack a Portaineren.`);
        const { id } = await p.createStackStandalone(
          nev,
          bemenet.compose,
          bemenet.env ?? [],
        );
        await connectDB();
        const doc = await InfraStack.create({
          nev,
          portainerStackId: id,
          tipus: bemenet.tipus ?? "projekt",
          partnerId: bemenet.partnerId,
          leiras: bemenet.leiras,
          utolsoSzinkron: new Date(),
        });
        return {
          uzenet: `A „${nev}” stack létrejött és elindult.`,
          reszletek: {
            portainerId: id,
            szolgaltatasok: el.szolgaltatasok.map((s) => s.nev),
          },
          extra: { stackId: String(doc._id) },
        };
      },
    );
  },

  /** Deletes the stack on Portainer; refuses while sites still point at it. */
  async torolStack(id: string, megerositettNev: string, szereplo: Szereplo) {
    const r = await sorBetolt(id).catch(() => null);
    if (!r) return hiba("A stack nem található.");
    return futtat(
      { celTipus: "stack", celId: id, celNev: r.nev },
      "stack.torles",
      szereplo,
      async () => {
        if (megerositettNev !== r.nev)
          throw new InfraHiba("A megerősítésként beírt név nem egyezik a stack nevével.");
        if (await InfraOldal.exists({ stackId: id }))
          throw new InfraHiba(
            "A stackhez még tartoznak oldalak — előbb töröld vagy helyezd át őket.",
          );
        if (!r.elveszett) {
          const p = szuksegesKliens(await kliensek(), "portainer");
          await p.deleteStack(r.portainerStackId);
        }
        await InfraStack.deleteOne({ _id: r._id });
        return { uzenet: `A „${r.nev}” stack törölve.` };
      },
    );
  },
};

async function stackAllapotValtas(id: string, mit: "start" | "stop", szereplo: Szereplo) {
  const r = await sorBetolt(id).catch(() => null);
  if (!r) return hiba("A stack nem található.");
  return futtat(
    { celTipus: "stack", celId: id, celNev: r.nev },
    mit === "start" ? "stack.inditas" : "stack.leallitas",
    szereplo,
    async () => {
      elveszettTiltas(r);
      const p = szuksegesKliens(await kliensek(), "portainer");
      if (mit === "start") await p.startStack(r.portainerStackId);
      else await p.stopStack(r.portainerStackId);
      return { uzenet: mit === "start" ? "A stack elindítva." : "A stack leállítva." };
    },
  );
}

async function konteinerAllit(
  id: string,
  konteiner: string,
  akcio: "start" | "stop",
  szereplo: Szereplo,
) {
  const r = await sorBetolt(id).catch(() => null);
  if (!r) return hiba("A stack nem található.");
  const inditas = akcio === "start";
  return futtat(
    { celTipus: "stack", celId: id, celNev: r.nev },
    inditas ? "konteiner.inditas" : "konteiner.leallitas",
    szereplo,
    async () => {
      elveszettTiltas(r);
      const p = szuksegesKliens(await kliensek(), "portainer");
      const c = await konteinerKeres(p, r, konteiner);
      await p.containerAction(c.id, akcio);
      return {
        uzenet: `„${c.nev}” ${inditas ? "elindítva" : "leállítva"}.`,
        reszletek: { konteiner: c.nev },
      };
    },
  );
}

async function konteinerKeres(
  p: PortainerPort,
  r: IInfraStack,
  kulcs: string,
): Promise<KonteinerSor> {
  const elo = await eloBetolt(p);
  const { stackenkent } = csoportosit(elo);
  const lista = stackenkent.get(r.portainerStackId) ?? [];
  const c =
    lista.find((k) => k.id === kulcs || k.id.startsWith(kulcs)) ??
    lista.find((k) => k.nev === kulcs || k.szolgaltatas === kulcs);
  if (!c) throw new InfraHiba(`A(z) „${kulcs}” konténer nem tartozik ehhez a stackhez.`);
  return c;
}

export type { SzinkronEredmeny };
export { oid, iso };
