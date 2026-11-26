import { Badge } from "@erp/ui";
import { JELZES_TIPUS_CIMKE, type JelzesTipus } from "@erp/jelzes/constants";

const datum = new Intl.DateTimeFormat("hu-HU", {
  timeZone: "Europe/Budapest",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Absolute and in Budapest time, so server and browser render the same text. */
export function formatJelzesDatum(iso: string): string {
  return datum.format(new Date(iso));
}

/** "Újdonság" (frissítési jegyzet) stands out; a körüzenet is marked; system events need none. */
export function JelzesTipusBadge({ tipus }: { tipus: JelzesTipus }) {
  if (tipus === "rendszer") return null;
  return (
    <Badge variant={tipus === "frissites" ? "default" : "secondary"} className="shrink-0">
      {JELZES_TIPUS_CIMKE[tipus]}
    </Badge>
  );
}
