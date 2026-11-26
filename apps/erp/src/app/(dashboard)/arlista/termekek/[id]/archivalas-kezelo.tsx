"use client";

import { archivalTermekAction, visszaallitTermekAction } from "../../actions";
import { ArchivalGomb } from "../../_components/form-bits";

export function ArchivalasKezelo({ id, archivalt }: { id: string; archivalt: boolean }) {
  return (
    <ArchivalGomb
      archivalt={archivalt}
      onArchival={(ok) => archivalTermekAction(id, ok)}
      onVisszaallit={() => visszaallitTermekAction(id)}
    />
  );
}
