import Link from "next/link";
import { DATA_TABLE_PAGE_SIZES } from "./query";

export function DataTablePagination({
  page,
  pageSize,
  total,
  basePath,
  queryString,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  queryString: (overrides: Record<string, string | number | undefined>) => string;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted-foreground text-sm">
          {page}. oldal / {totalPages} · {total} tétel
        </p>
        {onPageSizeChange && (
          <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
            Oldalanként
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-background h-8 rounded-md border px-2 text-sm"
              aria-label="Sorok száma egy oldalon"
            >
              {DATA_TABLE_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-2">
        {prevDisabled ? (
          <button
            type="button"
            disabled
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm opacity-50"
          >
            Előző
          </button>
        ) : (
          <Link
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm"
            href={`${basePath}?${queryString({ page: page - 1 })}`}
          >
            Előző
          </Link>
        )}

        {nextDisabled ? (
          <button
            type="button"
            disabled
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm opacity-50"
          >
            Következő
          </button>
        ) : (
          <Link
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm"
            href={`${basePath}?${queryString({ page: page + 1 })}`}
          >
            Következő
          </Link>
        )}
      </div>
    </div>
  );
}
