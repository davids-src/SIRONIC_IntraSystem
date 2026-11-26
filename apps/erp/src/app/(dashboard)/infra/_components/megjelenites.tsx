import { Badge } from "@erp/ui";
import {
  STACK_ALLAPOT_LABELS,
  STACK_ALLAPOT_TONES,
  type StackAllapot,
} from "@erp/infra/client";

export const datum = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })
    : undefined;

export function AllapotBadge({ allapot }: { allapot: StackAllapot }) {
  return (
    <Badge variant={STACK_ALLAPOT_TONES[allapot]}>{STACK_ALLAPOT_LABELS[allapot]}</Badge>
  );
}

export function KonteinerAllapotBadge({ allapot }: { allapot: string }) {
  const ton =
    allapot === "running"
      ? "success"
      : allapot === "restarting" || allapot === "dead"
        ? "danger"
        : allapot === "created"
          ? "info"
          : "neutral";
  const cimke: Record<string, string> = {
    running: "Fut",
    exited: "Leállt",
    restarting: "Újraindul",
    paused: "Szüneteltetve",
    created: "Létrehozva",
    dead: "Hibás",
  };
  return <Badge variant={ton}>{cimke[allapot] ?? allapot}</Badge>;
}

/** `ghcr.io/org/app:main@sha256:…` → `org/app:main` (digest and registry dropped; full ref in a tooltip). */
export function imageRovid(image: string): string {
  const be = image.replace(/@sha256:[0-9a-f]+$/i, "");
  if (/^sha256:[0-9a-f]+$/i.test(be)) return `sha256:${be.slice(7, 19)}`;
  const reszek = be.split("/");
  if (reszek.length > 2 && /[.:]/.test(reszek[0]!)) reszek.shift();
  return reszek.join("/");
}
