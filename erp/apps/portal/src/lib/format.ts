export const huf = (n: number | undefined, penznem = "HUF") =>
  n === undefined
    ? "—"
    : new Intl.NumberFormat("hu-HU", {
        style: "currency",
        currency: penznem,
        maximumFractionDigits: 0,
      }).format(n);

export const datum = (v: string | Date | undefined | null) =>
  v ? new Date(v).toLocaleDateString("hu-HU") : "—";

export const datumIdo = (v: string | Date | undefined | null) =>
  v
    ? new Date(v).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })
    : "—";
