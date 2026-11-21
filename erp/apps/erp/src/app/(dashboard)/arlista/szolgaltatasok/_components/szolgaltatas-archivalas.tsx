"use client";

import { archivalSzolgaltatasAction, visszaallitSzolgaltatasAction } from "../../actions";
import { ArchivalGomb } from "../../_components/form-bits";

export function SzolgaltatasArchivalas({ id, archivalt }: { id: string; archivalt: boolean }) {
  return (
    <ArchivalGomb
      archivalt={archivalt}
      onArchival={(ok) => archivalSzolgaltatasAction(id, ok)}
      onVisszaallit={() => visszaallitSzolgaltatasAction(id)}
    />
  );
}
