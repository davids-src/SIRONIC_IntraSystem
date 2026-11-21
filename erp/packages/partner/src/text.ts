/** Lower-case, accent-free, single-spaced key — used to detect duplicate partner names. */
export function partnerNevKulcs(nev: string): string {
  return nev
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
