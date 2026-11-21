"use client";

import { AlertTriangleIcon, CircleAlertIcon } from "lucide-react";
import { cn } from "@erp/lib";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import type { RowIssue } from "./types";

/** Warning / error icon with a real (hover + keyboard focus) tooltip listing every message. */
export function DataTableIssueIcon({ issues }: { issues: RowIssue[] }) {
  const danger = issues.some((i) => i.tone === "danger");
  const Icon = danger ? CircleAlertIcon : AlertTriangleIcon;
  const label = issues.map((i) => i.message).join(". ");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex shrink-0 cursor-help rounded-full p-0.5",
            danger ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="flex flex-col gap-0.5">
          {issues.map((i) => (
            <li key={i.message}>{i.message}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
