/**
 * "Szűrők megőrzése" (#62): every DataTable list remembers its last query (search, filters,
 * sort, page, page size) per list path for the browser tab, so the list comes back the way the
 * user left it when they return from an adatlap — via the adatlap's „Vissza” link, the
 * breadcrumb, the sidebar, or the browser's back button.
 *
 * The table state itself lives in the URL; this module only keeps a per-tab copy of it
 * (sessionStorage) and decides when a bare list URL should be rewritten to the remembered one.
 */

const STORAGE_PREFIX = "erp:list-query:v1:";
const SCROLL_PREFIX = "erp:list-scroll:v1:";

/** URL params owned by the DataTable. Everything else (e.g. `?ev=`, `?open=`) is foreign. */
export const TABLE_PARAM = /^(search|sort|page|pageSize|f\..+)$/;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Only the table's own params, in their original order. */
export function pickTableParams(params: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of params.entries()) if (TABLE_PARAM.test(k)) out.append(k, v);
  return out;
}

/** Params the table does not own — kept on every table change and on restore. */
export function pickForeignParams(params: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of params.entries()) if (!TABLE_PARAM.test(k)) out.append(k, v);
  return out;
}

/**
 * Foreign params that do not choose a different list (an opened side sheet, a map focus, the
 * export frame's own markers) — they never split the memory.
 */
const TRANSIENT_PARAM = /^(open|fokusz|__.+)$/;

/**
 * The memory key of a list: its path plus the foreign params that pick the view (sorted), e.g.
 * `/feladatok?nezet=kiadott`. One path can host several lists with different columns and filter
 * values (Feladatok tabs) — a filter remembered on one view must never be restored into another,
 * or the other view opens empty.
 */
export function listMemoryPath(path: string, params: URLSearchParams): string {
  const view = [...pickForeignParams(params).entries()]
    .filter(([k]) => !TRANSIENT_PARAM.test(k))
    .sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
  if (view.length === 0) return path;
  return `${path}?${new URLSearchParams(view).toString()}`;
}

export function hasTableParams(params: URLSearchParams): boolean {
  for (const k of params.keys()) if (TABLE_PARAM.test(k)) return true;
  return false;
}

/**
 * Whether a remembered query differs from what a bare list URL shows anyway. A query that only
 * carries `page=1` and a page size is not worth a URL rewrite — the page size is re-applied from
 * the table preferences already.
 */
export function isMeaningfulListQuery(query: string): boolean {
  const params = new URLSearchParams(query);
  for (const [k, v] of params.entries()) {
    if (k === "pageSize") continue;
    if (k === "page") {
      if (v !== "1" && v !== "") return true;
      continue;
    }
    if (v !== "") return true;
  }
  return false;
}

/**
 * Remembers the list's table query (`''` = the user cleared it on purpose), under the view the
 * params' foreign part picks (`listMemoryPath`).
 */
export function rememberListQuery(
  path: string,
  params: URLSearchParams,
  storage: StorageLike | null = defaultStorage(),
) {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_PREFIX + listMemoryPath(path, params),
      pickTableParams(params).toString(),
    );
  } catch {
    // quota / privacy mode — the list simply is not remembered
  }
}

/**
 * The remembered table query of a list view (`listMemoryPath` — a bare path is the view without
 * foreign params), or `null` when nothing was stored.
 */
export function recallListQuery(
  path: string,
  storage: StorageLike | null = defaultStorage(),
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(STORAGE_PREFIX + path);
  } catch {
    return null;
  }
}

/** Link target for "back to the list": the list path with its remembered query, if any. */
export function rememberedListHref(
  path: string,
  storage: StorageLike | null = defaultStorage(),
): string {
  const [bare, ownQuery] = path.split("?", 2);
  const params = new URLSearchParams(ownQuery ?? "");
  const stored = recallListQuery(listMemoryPath(bare!, params), storage);
  if (!stored || !isMeaningfulListQuery(stored)) return path;
  // A link that already names table params (e.g. a pre-filtered dashboard link) wins.
  if (hasTableParams(params)) return path;
  const merged = new URLSearchParams(stored);
  for (const [k, v] of params.entries()) merged.append(k, v);
  return `${bare}?${merged.toString()}`;
}

/**
 * The URL a list opened without any table params should be replaced with, or `null` to keep it.
 * Foreign params of the current URL stay; the table params come from the remembered query.
 */
export function restoredListSearch(
  current: URLSearchParams,
  stored: string | null,
): string | null {
  if (hasTableParams(current)) return null;
  if (!stored || !isMeaningfulListQuery(stored)) return null;
  const next = pickForeignParams(current);
  for (const [k, v] of new URLSearchParams(stored).entries()) next.append(k, v);
  return next.toString();
}

/* ---------------------------- history navigation ---------------------------- */

let lastPopstateAt = 0;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopstateAt = Date.now();
  });
}

/**
 * True right after a browser back/forward step. The URL then is exactly the history entry the
 * user asked for — a bare list URL must not be rewritten to the remembered query, otherwise
 * "back" could never undo a filter.
 */
export function isHistoryNavigation(now = Date.now(), windowMs = 1500): boolean {
  return lastPopstateAt > 0 && now - lastPopstateAt < windowMs;
}

/* ---------------------------------- scroll ---------------------------------- */

export function listScrollKey(path: string, params: URLSearchParams): string {
  const query = pickTableParams(params).toString();
  return query ? `${path}?${query}` : path;
}

export type ListScroll = { page: number; table: number };

export function rememberListScroll(
  key: string,
  scroll: ListScroll,
  storage: StorageLike | null = defaultStorage(),
) {
  if (!storage) return;
  try {
    storage.setItem(SCROLL_PREFIX + key, JSON.stringify(scroll));
  } catch {
    // ignore
  }
}

export function recallListScroll(
  key: string,
  storage: StorageLike | null = defaultStorage(),
): ListScroll | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SCROLL_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListScroll>;
    const page = Number(parsed.page) || 0;
    const table = Number(parsed.table) || 0;
    return { page, table };
  } catch {
    return null;
  }
}
