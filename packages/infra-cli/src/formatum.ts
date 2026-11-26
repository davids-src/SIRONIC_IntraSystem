/** Human-readable CLI output for the most used tools (everything else prints JSON). */
import type { Attekintes, EllenorzesTetel, OldalSor, StackSor } from "@erp/infra";

function tabla(fejlec: string[], sorok: string[][]): string {
  const szel = fejlec.map((f, i) =>
    Math.max(f.length, ...sorok.map((s) => (s[i] ?? "").length)),
  );
  const sor = (cells: string[]) =>
    cells
      .map((c, i) => c.padEnd(szel[i] ?? 0))
      .join("  ")
      .trimEnd();
  return [sor(fejlec), sor(szel.map((n) => "─".repeat(n))), ...sorok.map(sor)].join("\n");
}

const IKON = { ok: "✓", figyelmeztetes: "!", hiba: "✗" } as const;

export const FORMATUMOK: Record<string, (r: never) => string> = {
  overview: ((r: Attekintes) =>
    [
      `Stackek: ${r.stackek.osszes} (fut ${r.stackek.fut}, hibás ${r.stackek.hibas}, leállítva ${r.stackek.leallitva})`,
      `Konténerek: ${r.konteinerek.fut}/${r.konteinerek.osszes} fut · Oldalak: ${r.oldalak.osszes} (stack nélkül: ${r.oldalak.stacknelkul})`,
      `Tanúsítványok: ${r.tanusitvanyok.osszes}` +
        (r.tanusitvanyok.lejarKozel.length
          ? `\n  Lejár hamarosan:\n${r.tanusitvanyok.lejarKozel.map((c) => `   - #${c.id} ${c.nevek.join(", ")} (${c.napok} nap)`).join("\n")}`
          : " · nincs közeli lejárat"),
      r.konteinerek.problemas.length
        ? `Problémás konténerek:\n${r.konteinerek.problemas.map((c) => `   - ${c.stackNev ?? "?"}/${c.nev}: ${c.allapot}`).join("\n")}`
        : "Nincs problémás konténer.",
      r.arva.length
        ? `Stackhez nem tartozó konténerek: ${r.arva.map((c) => c.nev).join(", ")}`
        : "",
      `Integrációk: ${r.integraciok.map((i) => `${i.szolgaltato}${i.ok === undefined ? "?" : i.ok ? "✓" : "✗"}`).join("  ")}`,
      ...r.hibak.map((h) => `⚠ ${h}`),
    ]
      .filter(Boolean)
      .join("\n")) as never,
  stack_list: ((r: { stackek: StackSor[]; arva: unknown[] }) =>
    tabla(
      ["NÉV", "TÍPUS", "ÁLLAPOT", "KONT.", "OLDAL", "IMAGE-EK"],
      r.stackek.map((s) => [
        s.nev,
        s.tipus,
        s.allapot,
        `${s.futoSzam}/${s.konteneriSzam}`,
        String(s.oldalSzam),
        s.imagek.join(", ").slice(0, 70),
      ]),
    ) +
    (r.arva.length
      ? `\n\n(${r.arva.length} konténer nem tartozik stackhez)`
      : "")) as never,
  site_list: ((r: OldalSor[]) =>
    tabla(
      ["HOSTNÉV", "STACK", "CÉL", "PARTNER"],
      r.map((o) => [
        o.hostnevek.join(","),
        o.stackNev ?? "—",
        `${o.szolgaltatas}:${o.port}`,
        o.partnerNev ?? o.partnerId ?? "—",
      ]),
    )) as never,
  site_check: ((r: EllenorzesTetel[]) =>
    r
      .map((t) => `${IKON[t.szint]} ${t.kulcs.padEnd(9)} ${t.uzenet}`)
      .join("\n")) as never,
};
