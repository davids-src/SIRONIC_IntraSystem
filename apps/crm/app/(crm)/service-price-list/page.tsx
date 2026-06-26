import React from "react";
import { PageHeader, Button } from "@crm/ui";
import { Plus, Settings2 } from "lucide-react";
import {
  ServiceCategoryModel,
  ServiceSubCategoryModel,
  ServicePriceListItemModel,
  PricingSettingsModel,
  serializeForJson,
  connectDb,
} from "@crm/db";
import { requireCrmAuth } from "@/lib/api-helpers";
import { hasPermission } from "@crm/rbac";
import { ServicePriceTable } from "./components/ServicePriceTable";
import Link from "next/link";
import CategoryManagerModalClientWrapper from "./components/CategoryManagerModalClientWrapper";
import NewServiceItemButton from "./components/NewServiceItemButton";

export const metadata = {
  title: "Szolgáltatás Árlista | SIRONIC",
};

export default async function ServicePriceListPage() {
  const { actor } = await requireCrmAuth();

  // Ellenőrizzük, hogy van-e hozzáférése
  if (
    !hasPermission(actor, {
      module: "service_price_list",
      action: "view",
      scope: "global",
    })
  ) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Szolgáltatás Árlista"
          subtitle="Nincs jogosultságod ehhez a modulhoz."
        />
      </div>
    );
  }

  const isAdmin = hasPermission(actor, {
    module: "pricing_settings",
    action: "view",
    scope: "global",
  });

  // Load initial data
  const tenantFilter = { tenantId: actor.tenantId };
  await connectDb();

  const [cats, subcats, items, settings] = await Promise.all([
    ServiceCategoryModel.find(tenantFilter).sort({ sort_order: 1 }).lean(),
    ServiceSubCategoryModel.find(tenantFilter).sort({ sort_order: 1 }).lean(),
    ServicePriceListItemModel.find({ ...tenantFilter, is_archived: false })
      .sort({ category_id: 1, sort_order: 1, name: 1 })
      .lean(),
    PricingSettingsModel.findOne(tenantFilter).lean(),
  ]);

  const sanitizedItems = items.map((item) => {
    if (!isAdmin) {
      const { internal_base_price: _omit, ...rest } = item as any;
      return rest;
    }
    return item;
  });

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Szolgáltatás Árlista"
        subtitle="Vállalati szolgáltatások, belső óradíjak és dinamikus árképzési tételek"
        actions={
          <div className="flex items-center gap-3">
            <CategoryManagerModalClientWrapper />
            <NewServiceItemButton />
          </div>
        }
      />

      <ServicePriceTable
        initialCategories={serializeForJson(cats) as any}
        initialSubcategories={serializeForJson(subcats) as any}
        initialItems={serializeForJson(sanitizedItems) as any}
        initialPricingSettings={serializeForJson(settings) as any}
        isAdmin={isAdmin}
      />
    </div>
  );
}
