/**
 * Task notifications (#68). A new task is a push (+ e-mail for who opted into "Új feladat") —
 * it already sits in Teendőim. What happens on a task afterwards — it changed, you became its
 * felelős, someone wrote, you were mentioned — also lands in the bell (Jelzés), so it can be
 * found later, plus push, plus e-mail for who opted into "Feladat változásai" (#71).
 *
 * Every person gets the link to their own copy. Never throws (`jelzesKuld` does not).
 */
import { jelzesKuld } from "@/lib/jelzes";

export type FeladatErtesitesCelpont = { userId: string; feladatId: string };

const rovid = (s: string, max = 140) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Sends one notification per recipient, each to their own copy; never to the sender. */
export async function ertesitFeladatValtozas(
  celok: FeladatErtesitesCelpont[],
  uzenet: { title: string; body?: string },
  kuldo: { id: string; nev?: string },
): Promise<void> {
  const egyedi = new Map<string, FeladatErtesitesCelpont>();
  for (const c of celok)
    if (c.userId !== kuldo.id && !egyedi.has(c.userId)) egyedi.set(c.userId, c);
  await Promise.all(
    [...egyedi.values()].map((c) =>
      jelzesKuld([c.userId], {
        title: rovid(uzenet.title),
        body: uzenet.body ? rovid(uzenet.body, 400) : undefined,
        url: `/feladatok/${c.feladatId}`,
        tag: `feladat-${c.feladatId}`,
        kuldo,
        emailKategoria: "feladat_valtozas",
      }),
    ),
  );
}

/**
 * "Mostantól te vagy a felelős" — for a handover, a re-given task, a new primary felelős or a
 * workflow step that became active (exported for the folyamat engine, #67). `ok` says why.
 */
export async function ertesitFelelosValtozas(input: {
  userId: string;
  feladatId: string;
  cim: string;
  kuldo: { id: string; nev?: string };
  ok?: string;
}): Promise<void> {
  await ertesitFeladatValtozas(
    [{ userId: input.userId, feladatId: input.feladatId }],
    {
      title: `Te vagy a felelős: ${input.cim}`,
      body: input.ok ?? `${input.kuldo.nev ?? "Valaki"} téged jelölt ki felelősnek.`,
    },
    input.kuldo,
  );
}

/** A new task: push + e-mail ("Új feladat"), no bell row — it is on the Teendőim list. */
export async function ertesitUjFeladat(
  celok: FeladatErtesitesCelpont[],
  uzenet: { title: string; body?: string },
  kuldoId: string,
): Promise<void> {
  await Promise.all(
    celok
      .filter((c) => c.userId !== kuldoId)
      .map((c) =>
        jelzesKuld([c.userId], {
          title: rovid(uzenet.title),
          body: uzenet.body,
          url: `/feladatok/${c.feladatId}`,
          jelzes: false,
          tag: `feladat-${c.feladatId}`,
          emailKategoria: "feladat_uj",
        }),
      ),
  );
}
