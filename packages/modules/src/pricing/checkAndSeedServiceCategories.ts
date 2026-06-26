/**
 * Az első betöltéskor (ha nincs még ServiceCategory a tenanthoz) automatikusan
 * létrehozza a 10 alapértelmezett kategóriát az Excel V5 mátrix struktúrája alapján.
 *
 * FONTOS: A seed NEM hardcodeolt – az admin bármikor módosíthatja vagy törölheti a
 * kategóriákat. A seed csak az inicializálást segíti.
 */
export async function checkAndSeedServiceCategories(
  tenantId: string,
  ServiceCategoryModel: any, // Mongoose model – any a körkörös importok elkerüléséhez
): Promise<void> {
  const count = await ServiceCategoryModel.countDocuments({ tenantId });
  if (count > 0) return; // Már van kategória, nem szükséges seed

  const defaultCategories = [
    {
      name: "IT Rendszerüzemeltetés",
      sku_prefix: "IT",
      icon: "Monitor",
      color: "#6366f1",
      sort_order: 1,
    },
    {
      name: "Hálózatépítés és Fejlesztés",
      sku_prefix: "HL",
      icon: "Network",
      color: "#8b5cf6",
      sort_order: 2,
    },
    {
      name: "Weboldal és Fejlesztés",
      sku_prefix: "WB",
      icon: "Globe",
      color: "#06b6d4",
      sort_order: 3,
    },
    {
      name: "Szervíz és Javítás",
      sku_prefix: "SZ",
      icon: "Wrench",
      color: "#f59e0b",
      sort_order: 4,
    },
    {
      name: "NIS2 Megfelelés",
      sku_prefix: "N2",
      icon: "Shield",
      color: "#10b981",
      sort_order: 5,
    },
    {
      name: "Biztonságtechnika",
      sku_prefix: "BT",
      icon: "Camera",
      color: "#f43f5e",
      sort_order: 6,
    },
    {
      name: "Tűzjelző Rendszer",
      sku_prefix: "TJ",
      icon: "Flame",
      color: "#ef4444",
      sort_order: 7,
    },
    {
      name: "Tűzvédelem",
      sku_prefix: "TV",
      icon: "ShieldAlert",
      color: "#dc2626",
      sort_order: 8,
    },
    {
      name: "Épületvillamosság",
      sku_prefix: "VL",
      icon: "Zap",
      color: "#eab308",
      sort_order: 9,
    },
    {
      name: "Projekt Megbízott",
      sku_prefix: "PM",
      icon: "ClipboardList",
      color: "#64748b",
      sort_order: 10,
    },
  ];

  await ServiceCategoryModel.insertMany(
    defaultCategories.map((cat) => ({
      tenantId,
      ...cat,
      is_active: true,
      description: null,
    })),
  );
}
