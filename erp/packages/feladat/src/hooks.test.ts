import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearKapcsoltFeladatHooks,
  fireKapcsoltFeladatHook,
  registerKapcsoltFeladatHook,
  type KapcsoltFeladatEsemeny,
} from "./hooks";

const esemeny = (modul: string): KapcsoltFeladatEsemeny => ({
  tipus: "lezarva",
  feladatId: "f1",
  kapcsolat: { modul, tipus: "ajanlatkeres", id: "AK-1", url: "/x" },
  actorId: "u1",
});

afterEach(() => clearKapcsoltFeladatHooks());

describe("kapcsolt feladat hooks (#50)", () => {
  it("calls only the hook of the owning module", async () => {
    const vallalkozas = vi.fn();
    const gepeszet = vi.fn();
    registerKapcsoltFeladatHook("vallalkozas", vallalkozas);
    registerKapcsoltFeladatHook("gepeszet", gepeszet);
    await fireKapcsoltFeladatHook(esemeny("vallalkozas"));
    expect(vallalkozas).toHaveBeenCalledWith(esemeny("vallalkozas"));
    expect(gepeszet).not.toHaveBeenCalled();
  });

  it("does nothing for a module without a hook, and swallows a failing hook", async () => {
    await expect(fireKapcsoltFeladatHook(esemeny("nincs"))).resolves.toBeUndefined();
    const hiba = vi.spyOn(console, "error").mockImplementation(() => {});
    registerKapcsoltFeladatHook("rossz", async () => {
      throw new Error("x");
    });
    await expect(fireKapcsoltFeladatHook(esemeny("rossz"))).resolves.toBeUndefined();
    expect(hiba).toHaveBeenCalled();
    hiba.mockRestore();
  });
});
