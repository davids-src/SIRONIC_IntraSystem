/**
 * Typed in-process domain-event emitter. Used only for one-directional side effects that
 * would otherwise require an illegal upstream→downstream import (see docs/ARCHITECTURE.md §1) —
 * blocking invariants must still go through a direct facade call, never an event.
 *
 * Listener failures are logged and swallowed: emitting an event is a best-effort side
 * effect, not part of the emitting action's own transaction.
 */

export type DomainEventPayloads = {
  "job.created": { jobId: string; code: string; name: string };
  /** Értékesítés: an offer was accepted (consumers: projekt, bizonylat — wired by the app). */
  "ajanlat.elfogadva": {
    ajanlatId: string;
    azonosito: string;
    partnerId: string;
    partnerNev: string;
    nettoOsszeg: number;
    bruttoOsszeg: number;
    penznem: string;
    elfogadtaUserId: string;
  };
  /** Bizonylat: a customer signed a completion certificate (consumer: invoice draft task, wired by the app). */
  "teljesitesigazolas.elfogadva": {
    igazolasId: string;
    azonosito: string;
    partnerId: string;
    partnerNev: string;
    projektId?: string;
    nettoOsszeg: number;
    bruttoOsszeg: number;
    penznem: string;
    alairoNev: string;
  };
  /**
   * Készlet: an issue left a stock row at or below its minimum (consumer: stock-manager
   * Jelzés, wired by the app). Emitted best-effort by `keszletApi.kiad` after a real (non-replayed) issue.
   */
  "keszlet.alacsony": {
    tetelId: string;
    arlistaTermekId: string;
    nev: string;
    kod: string;
    raktarhelyKod: string;
    keszlet: number;
    minimum: number;
  };
};

export type DomainEventName = keyof DomainEventPayloads;

type Listener<E extends DomainEventName> = (
  payload: DomainEventPayloads[E],
) => void | Promise<void>;

/** Internal storage is untyped on purpose — `onDomainEvent`/`emitDomainEvent` are the typed boundary. */
type UntypedListener = (payload: unknown) => void | Promise<void>;

const listeners = new Map<DomainEventName, Set<UntypedListener>>();

export function onDomainEvent<E extends DomainEventName>(
  event: E,
  listener: Listener<E>,
): void {
  const set = listeners.get(event) ?? new Set<UntypedListener>();
  set.add(listener as UntypedListener);
  listeners.set(event, set);
}

export async function emitDomainEvent<E extends DomainEventName>(
  event: E,
  payload: DomainEventPayloads[E],
): Promise<void> {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;

  await Promise.all(
    Array.from(set).map(async (listener) => {
      try {
        await listener(payload);
      } catch (error) {
        console.error(`[domain-event] listener for "${event}" failed`, error);
      }
    }),
  );
}

/** Test-only: reset all listeners between test files. */
export function clearDomainEventListenersForTests(): void {
  listeners.clear();
}
