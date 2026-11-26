import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@erp/lib";

export function DataTableSortHeader({
  label,
  sortKey,
  currentSort,
  basePath,
  queryString,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSort?: string;
  basePath: string;
  queryString: (overrides: Record<string, string | number | undefined>) => string;
  /** Called with the sort the link is about to apply — lets the table remember it. */
  onSort?: (sort: string) => void;
}) {
  const isDesc = currentSort === `-${sortKey}`;
  const isAsc = currentSort === sortKey;

  const nextSort = isDesc ? sortKey : `-${sortKey}`;

  return (
    <Link
      href={`${basePath}?${queryString({ sort: nextSort, page: 1 })}`}
      onClick={() => onSort?.(nextSort)}
      className={cn(
        "inline-flex items-center gap-1 hover:underline",
        (isAsc || isDesc) && "text-foreground",
      )}
    >
      {label}
      {isAsc && <ArrowUp className="size-2.5" />}
      {isDesc && <ArrowDown className="size-2.5" />}
    </Link>
  );
}
