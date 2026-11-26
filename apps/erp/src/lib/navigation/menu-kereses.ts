/**
 * Menu / module quick search (header search box). Pure, so it is unit-tested and runs in the
 * browser: the entries are computed on the server from the viewer's permissions (a hidden menu
 * item is never offered) and filtered on every keystroke without any request.
 */
export type MenuBejegyzes = {
  label: string;
  href: string;
  /** Sidebar group / module the entry belongs to ("Általános", "Értékesítés", ...). */
  csoport: string;
};

/** Lower case, accents removed ("Árlista" matches "arlista"), whitespace collapsed. */
export function normalizalKereses(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Entries whose label or group contains every word of `q`. Label-prefix matches come first, then
 * label matches, then group (module) matches; ties keep the sidebar order.
 */
export function szuresMenu(
  bejegyzesek: MenuBejegyzes[],
  q: string,
  limit = 8,
): MenuBejegyzes[] {
  const szavak = normalizalKereses(q).split(" ").filter(Boolean);
  if (szavak.length === 0) return [];
  const scored: Array<{ b: MenuBejegyzes; rang: number; i: number }> = [];
  bejegyzesek.forEach((b, i) => {
    const label = normalizalKereses(b.label);
    const csoport = normalizalKereses(b.csoport);
    const mind = szavak.every((w) => label.includes(w) || csoport.includes(w));
    if (!mind) return;
    const rang = szavak.every((w) => label.startsWith(w))
      ? 0
      : szavak.every((w) => label.includes(w))
        ? 1
        : 2;
    scored.push({ b, rang, i });
  });
  return scored
    .sort((a, b) => a.rang - b.rang || a.i - b.i)
    .slice(0, limit)
    .map((s) => s.b);
}

type Csoport = { label: string; items: Array<{ href: string; label: string }> };

/** Flattens sidebar groups (already permission-filtered) into search entries, de-duplicated by href. */
export function menuBejegyzesek(csoportok: Csoport[]): MenuBejegyzes[] {
  const seen = new Set<string>();
  const out: MenuBejegyzes[] = [];
  for (const g of csoportok)
    for (const it of g.items) {
      if (seen.has(it.href)) continue;
      seen.add(it.href);
      out.push({ label: it.label, href: it.href, csoport: g.label });
    }
  return out;
}

/** The fixed (non-module) sidebar entries, with the same permission gates as the sidebar. */
export function alapMenu(hasPermission: (key: string) => boolean): Csoport[] {
  const admin: Csoport["items"] = [];
  if (hasPermission("admin:access")) {
    if (hasPermission("users:read"))
      admin.push({ href: "/admin/users", label: "Felhasználók" });
    if (hasPermission("roles:manage"))
      admin.push({ href: "/admin/permissions", label: "Szerepkörök" });
    if (hasPermission("mail:manage"))
      admin.push({ href: "/admin/mail-templates", label: "E-mail sablonok" });
    admin.push({ href: "/admin/branding", label: "Arculat" });
  }
  return [
    {
      label: "Általános",
      items: [
        { href: "/", label: "Vezérlőpult" },
        { href: "/feladatok", label: "Feladatok" },
        { href: "/jelzesek", label: "Értesítések" },
        { href: "/help", label: "Súgó" },
      ],
    },
    { label: "Beállítások", items: [{ href: "/account", label: "Fiók" }] },
    ...(admin.length ? [{ label: "Adminisztráció", items: admin }] : []),
  ];
}
