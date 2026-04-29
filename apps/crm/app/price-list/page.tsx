"use client";

import { PageHeader } from "@crm/ui";

export default function PriceListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Árlista"
        subtitle="Árlista tételek (árak referencia) a rugalmas ajánlatkészítéshez"
      />

      <div className="text-sm text-[var(--color-text-muted)]">
        (UI demo) A tényleges Price List CRUD és árlista kategóriák a következő
        iterációban kerülnek be.
      </div>
    </div>
  );
}
