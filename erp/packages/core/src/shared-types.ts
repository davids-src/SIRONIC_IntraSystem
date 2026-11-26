/**
 * Cross-module DTOs. Only shapes that more than one domain module needs to agree on
 * belong here — this is wiring, not a shared domain layer. See docs/ARCHITECTURE.md §1.
 */

/** Szerződés lifecycle (Vállalkozás, PROJECT_PLAN #55); Termelés only ever checks `alairt`. */
export type ContractStatus =
  | "tervezet"
  | "velemenyezes"
  | "partner_alairas"
  | "rec_alairt"
  | "alairt"
  | "lejart"
  | "megszunt";

export type JobSummary = {
  jobId: string;
  /** 5-digit job code, e.g. "00042". */
  code: string;
  name: string;
  status: string;
};

/** Normalized shape every module's `listMyAssignments` facade query returns. */
export type TaskRef = {
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  status: string;
  url: string;
  dueDate?: string;
  /**
   * `assignment` = something the user is responsible for (a machine, a container) rather than
   * something to do — listed separately and not counted as an open task. Default `task`.
   */
  kind?: "task" | "assignment";
  /** The asset the item is about (e.g. the machine of a due service), for grouping. */
  contextId?: string;
  contextLabel?: string;
};

/** One "who changed what" entry — the latest status change of an entity, from `statusHistory`. */
export type ActivityRef = {
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  /** Human label of the status the entity was moved to. */
  statusLabel: string;
  changedAt: string;
  changedBy: string;
  note?: string;
  url: string;
};

/** A notification a module facade asks the app to send (Jelzés + push + optional e-mail). */
export type Ertesites = {
  userIds: string[];
  title: string;
  body?: string;
  url: string;
  tag?: string;
};

/** Who is searching: module `search` facade methods are gated on the viewer's permissions. */
export type SearchViewer = { userId: string; permissions: readonly string[] };

/** One global-search hit — what every module facade's `search(query, viewer)` returns. */
export type SearchHit = {
  module: string;
  /** Human entity label, e.g. "Partner", "Ajánlat". */
  entityLabel: string;
  entityId: string;
  title: string;
  subtitle?: string;
  url: string;
};

/** How many hits one entity type contributes to the global search. */
export const SEARCH_PER_TYPE = 5;
