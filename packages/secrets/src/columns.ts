import type { ColumnDef } from "@erp/ui";

export type SecretListItem = {
  _id: string;
  name: string;
  description?: string;
  partnerId?: string;
  ownerId: string;
  ownerName?: string;
  /** True when the viewer owns it (otherwise it was shared with them). */
  mine: boolean;
  updatedAt: string;
};

/** Deliberately no value / ciphertext column — the list never carries it. */
export const SECRET_LIST_COLUMNS: Array<ColumnDef<SecretListItem>> = [
  { key: "name", label: "Név", sortable: true, filterable: true, searchable: true },
  { key: "description", label: "Leírás", searchable: true, filterable: true },
  {
    key: "partnerId",
    label: "Partner",
    sortable: true,
    filterable: true,
    defaultVisible: false,
  },
  { key: "ownerName", label: "Tulajdonos", sortable: true, filterable: true },
  {
    key: "updatedAt",
    label: "Frissítve",
    type: "date",
    sortable: true,
    filterable: true,
  },
];
