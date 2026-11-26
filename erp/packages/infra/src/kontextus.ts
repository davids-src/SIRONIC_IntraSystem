import { connectDB } from "@erp/db-core";
import { IntegracioKapcsolat } from "./models";
import {
  alapKliensGyar,
  kliensekEpit,
  type InfraKliensek,
  type KliensGyar,
} from "./kliensek";

let gyarFelulir: KliensGyar | null = null;
let cache: { at: number; kliensek: InfraKliensek } | null = null;
const CACHE_MS = 60_000;

/** Test seam: replace the provider clients with fakes (pass `null` to restore). */
export function kliensGyarBeallit(gyar: KliensGyar | null): void {
  gyarFelulir = gyar;
  cache = null;
}

/** Call after an integration changed so the next operation rebuilds the clients. */
export function kliensCacheTorol(): void {
  cache = null;
}

/** Provider clients built from the active stored connections (cached for a minute). */
export async function kliensek(): Promise<InfraKliensek> {
  if (!gyarFelulir && cache && Date.now() - cache.at < CACHE_MS) return cache.kliensek;
  await connectDB();
  const sorok = await IntegracioKapcsolat.find({ aktiv: true })
    .sort({ createdAt: 1 })
    .exec();
  const k = kliensekEpit(sorok, gyarFelulir ?? alapKliensGyar);
  if (!gyarFelulir) cache = { at: Date.now(), kliensek: k };
  return k;
}
