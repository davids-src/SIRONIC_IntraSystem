"use client";

import { useMemo, useState } from "react";
import { Button, Label, cn } from "@erp/ui";
import {
  DEFAULT_THEME,
  THEME_ROLES,
  THEME_ROLE_LABELS,
  resolveTheme,
  themeVars,
  validateTheme,
  type ThemeColors,
  type ThemeRole,
} from "@erp/core/theme";

/**
 * Role colours (Arculat → Színek): a picker per role, checked live against the role's rule and
 * previewed on real buttons in light and dark mode. Saved with the Arculat form (`theme_<role>`
 * fields); "Alapértelmezett" resets the whole theme (`themeReset`).
 */
export function ThemeEditor({
  initial,
  serverErrors,
}: {
  initial: Partial<Record<ThemeRole, string>> | undefined;
  serverErrors?: Record<string, string[]>;
}) {
  const [theme, setTheme] = useState<ThemeColors>(() => resolveTheme(initial));
  const [reset, setReset] = useState(false);
  const errors = useMemo(() => validateTheme(theme), [theme]);
  const valid = Object.keys(errors).length === 0;

  const set = (role: ThemeRole, v: string) => {
    setReset(false);
    setTheme((t) => ({ ...t, [role]: v.trim().toLowerCase() }));
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Színek</h2>
        <p className="text-muted-foreground text-sm">
          Az alkalmazás színei szerepenként. A rendszer ellenőrzi, hogy a szín illik a
          szerephez (hibára csak piros, sikerre csak zöld jöhet), a szöveg színét és a
          sötét módot pedig magától számolja.
        </p>
      </div>

      <input type="hidden" name="themeReset" value={reset ? "1" : ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        {THEME_ROLES.map((role) => {
          const err = errors[role] ?? serverErrors?.[`theme_${role}`]?.[0];
          return (
            <div key={role} className="flex flex-col gap-1.5">
              <Label htmlFor={`theme_${role}`}>{THEME_ROLE_LABELS[role].label}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${THEME_ROLE_LABELS[role].label} színválasztó`}
                  value={/^#[0-9a-f]{6}$/.test(theme[role]) ? theme[role] : "#000000"}
                  onChange={(e) => set(role, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
                />
                <input
                  id={`theme_${role}`}
                  name={`theme_${role}`}
                  value={theme[role]}
                  onChange={(e) => set(role, e.target.value)}
                  spellCheck={false}
                  maxLength={7}
                  aria-invalid={Boolean(err)}
                  className={cn(
                    "border-input h-9 w-28 rounded-md border bg-transparent px-2 font-mono text-sm",
                    err && "border-danger",
                  )}
                />
              </div>
              <p className={cn("text-xs", err ? "text-danger" : "text-muted-foreground")}>
                {err ?? THEME_ROLE_LABELS[role].help}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {([false, true] as const).map((dark) => (
          <div
            key={String(dark)}
            style={
              {
                ...themeVars(valid ? theme : undefined, dark),
                background: dark ? "oklch(0.141 0.005 286)" : "#fff",
                color: dark ? "#fafafa" : "#18181b",
              } as React.CSSProperties
            }
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <span className="text-xs font-medium opacity-70">
              {dark ? "Sötét mód" : "Világos mód"} — előnézet
            </span>
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm">
                Elsődleges
              </span>
              <span className="bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm">
                Másodlagos
              </span>
              <span className="bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-sm">
                Kiemelő
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["success", "warning", "danger"] as const).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs",
                    t === "success" &&
                      "bg-success-soft text-success-soft-foreground border-success-border",
                    t === "warning" &&
                      "bg-warning-soft text-warning-soft-foreground border-warning-border",
                    t === "danger" &&
                      "bg-danger-soft text-danger-soft-foreground border-danger-border",
                  )}
                >
                  {t === "success" ? "Kész" : t === "warning" ? "Közeleg" : "Lejárt"}
                </span>
              ))}
              <span className="bg-danger text-danger-foreground rounded-md px-3 py-1 text-xs">
                Törlés
              </span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setTheme({ ...DEFAULT_THEME });
            setReset(true);
          }}
        >
          Alapértelmezett színek
        </Button>
      </div>
    </section>
  );
}
