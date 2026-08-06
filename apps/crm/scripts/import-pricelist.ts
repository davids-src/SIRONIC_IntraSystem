import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import {
  connectDb,
  TenantModel,
  CrmUserModel,
  ServiceCategoryModel,
  ServiceSubCategoryModel,
  ServicePriceListItemModel,
  nextCounterValue,
  formatNumber,
} from "@crm/db";

// Read env variables manually to avoid dotenv dependency
const envPath = path.resolve(".env");
console.log("Loading environment from:", envPath);
try {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2 && parts[0]) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim();
      process.env[key] = value;
    }
  });
} catch (e: any) {
  console.error("Error reading env:", e.message);
}

if (!process.env.MONGODB_URI) {
  console.error("Error: MONGODB_URI is not set in environment variables.");
  process.exit(1);
}

interface SubCategoryMapping {
  name: string;
  startRow: number; // 1-indexed row number
  endRow: number; // 1-indexed row number
}

interface CategoryMapping {
  name: string;
  sku_prefix: string;
  color: string;
  subcategories: SubCategoryMapping[];
}

const CATEGORY_MAP: CategoryMapping[] = [
  {
    name: "IT Rendszerüzemeltetés",
    sku_prefix: "IT",
    color: "#3b82f6",
    subcategories: [
      { name: "Üzemeltetési csomagok", startRow: 6, endRow: 13 },
      { name: "Kliens felügyelet", startRow: 15, endRow: 26 },
      { name: "IT biztonság", startRow: 28, endRow: 34 },
      { name: "Szerver és Hálózat felügyelet", startRow: 36, endRow: 43 },
      { name: "Monitoring és Riportálás", startRow: 45, endRow: 48 },
    ],
  },
  {
    name: "Hálózatépítés és Fejlesztés",
    sku_prefix: "HL",
    color: "#10b981",
    subcategories: [
      { name: "Felmérés és Tervezés", startRow: 51, endRow: 55 },
      { name: "Aktív eszközök konfigurálása", startRow: 57, endRow: 61 },
      { name: "Wi-Fi hálózatok", startRow: 63, endRow: 67 },
      { name: "Vezetékes hálózat építés", startRow: 69, endRow: 73 },
      { name: "Távkapcsolat és VPN", startRow: 75, endRow: 78 },
      { name: "IP telefonrendszerek", startRow: 80, endRow: 82 },
    ],
  },
  {
    name: "Weboldal és Fejlesztés",
    sku_prefix: "WB",
    color: "#8b5cf6",
    subcategories: [
      { name: "Egyedi Webfejlesztés", startRow: 86, endRow: 92 },
      { name: "WordPress fejlesztés és karbantartás", startRow: 94, endRow: 104 },
      { name: "Domain és Tárhely szolgáltatások", startRow: 106, endRow: 109 },
      { name: "SEO és Analitika", startRow: 111, endRow: 113 },
    ],
  },
  {
    name: "Szervíz és Javítás",
    sku_prefix: "SZ",
    color: "#f59e0b",
    subcategories: [
      { name: "Szoftveres javítások", startRow: 117, endRow: 124 },
      { name: "Hardveres javítások (PC/Laptop)", startRow: 126, endRow: 138 },
      { name: "Mobil eszközök javítása", startRow: 140, endRow: 150 },
      { name: "Perifériák és Kiegészítők", startRow: 152, endRow: 157 },
    ],
  },
  {
    name: "NIS2 Megfelelés",
    sku_prefix: "N2",
    color: "#ef4444",
    subcategories: [
      { name: "NIS2 Megfelelés", startRow: 160, endRow: 163 },
      { name: "Adatvédelem és Tréningek", startRow: 164, endRow: 166 },
    ],
  },
  {
    name: "Biztonságtechnika",
    sku_prefix: "BT",
    color: "#6366f1",
    subcategories: [
      { name: "CCTV (Kamerarendszerek)", startRow: 170, endRow: 178 },
      { name: "Intruders (Riasztórendszerek)", startRow: 180, endRow: 188 },
      { name: "Access Control (Beléptető)", startRow: 190, endRow: 194 },
    ],
  },
  {
    name: "Tűzjelző Rendszer",
    sku_prefix: "TJ",
    color: "#ec4899",
    subcategories: [{ name: "Fire Alarm (Tűzjelző)", startRow: 196, endRow: 206 }],
  },
  {
    name: "Épületvillamosság",
    sku_prefix: "VL",
    color: "#f59e0b",
    subcategories: [
      { name: "Tervezés és Dokumentáció", startRow: 210, endRow: 213 },
      { name: "Villanyszerelési munkák", startRow: 215, endRow: 221 },
      { name: "E-Mobility (EV Töltők)", startRow: 223, endRow: 228 },
      { name: "Smart Home & Building", startRow: 230, endRow: 233 },
      { name: "Ipari villamos hálózatok", startRow: 235, endRow: 239 },
    ],
  },
  {
    name: "Tűzvédelem",
    sku_prefix: "TV",
    color: "#f43f5e",
    subcategories: [
      { name: "Tűzvédelmi Szabályozás", startRow: 243, endRow: 249 },
      { name: "Tűzgátló Rendszerek", startRow: 251, endRow: 254 },
      { name: "Aktív Oltórendszerek", startRow: 256, endRow: 259 },
    ],
  },
  {
    name: "Projekt Megbízott",
    sku_prefix: "PM",
    color: "#6b7280",
    subcategories: [{ name: "Projektmenedzsment", startRow: 262, endRow: 268 }],
  },
];

function findCategoryAndSubCategory(
  rowNum: number,
): { category: CategoryMapping; subcategory: SubCategoryMapping } | null {
  for (const cat of CATEGORY_MAP) {
    for (const sub of cat.subcategories) {
      if (rowNum >= sub.startRow && rowNum <= sub.endRow) {
        return { category: cat, subcategory: sub };
      }
    }
  }
  return null;
}

async function main() {
  const excelPath = path.resolve("../../SIROTECH_Arazasi_Matrix_V4 (1) - Copy.xlsx");
  console.log("Excel elérési útja:", excelPath);
  if (!fs.existsSync(excelPath)) {
    console.error("Hiba: Az Excel fájl nem található a megadott helyen.");
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0] || "Sheet1";
  const worksheet: any = workbook.Sheets[sheetName];

  console.log("Kapcsolódás az adatbázishoz...");
  const mongooseInstance = await connectDb();
  console.log("Adatbázis kapcsolat létrejött!");

  // Megkeressük az első aktív CRM felhasználót, és az ő bérlőjéhez (Tenant) rendeljük a tételeket.
  // Ez biztosítja, hogy a belépett felhasználók bérlőjére kerüljenek az adatok.
  const user: any = await CrmUserModel.findOne().lean();
  let tenantId = "";
  let tenantName = "";

  if (user && user.tenantId) {
    tenantId = String(user.tenantId);
    const tenantDoc: any = await TenantModel.findById(tenantId).lean();
    tenantName = tenantDoc ? tenantDoc.name : "Ismeretlen bérlő";
  } else {
    const tenant: any = await TenantModel.findOne().lean();
    if (!tenant) {
      console.error("Hiba: Nem található bérlő (Tenant) az adatbázisban.");
      await mongooseInstance.disconnect();
      process.exit(1);
    }
    tenantId = String(tenant._id);
    tenantName = tenant.name;
  }

  console.log(`Cél bérlő: ${tenantName} (${tenantId})`);

  // Kategóriák és alkategóriák előzetes ellenőrzése és létrehozása
  const catDbMap = new Map<string, string>();
  const subCatDbMap = new Map<string, string>();

  for (const cat of CATEGORY_MAP) {
    // Először ellenőrizzük a nevet
    let catDoc: any = await ServiceCategoryModel.findOne({ name: cat.name, tenantId });
    // Ha név alapján nem találjuk, megpróbáljuk a sku_prefix alapján lekérni, hogy megelőzzük a duplikált index hibát
    if (!catDoc) {
      catDoc = await ServiceCategoryModel.findOne({
        sku_prefix: cat.sku_prefix,
        tenantId,
      });
    }

    if (!catDoc) {
      console.log(`Új fő kategória létrehozása: "${cat.name}" (SKU: ${cat.sku_prefix})`);
      catDoc = await ServiceCategoryModel.create({
        tenantId,
        name: cat.name,
        icon: "Folder",
        sku_prefix: cat.sku_prefix,
        color: cat.color,
        sort_order: 0,
        is_active: true,
      });
    } else {
      console.log(`Létező fő kategória: "${catDoc.name}" (SKU: ${catDoc.sku_prefix})`);
      // Biztonság kedvéért frissítjük a nevet, ha eltért
      if (catDoc.name !== cat.name) {
        catDoc.name = cat.name;
        await catDoc.save();
      }
    }
    catDbMap.set(cat.name, String(catDoc._id));

    for (const sub of cat.subcategories) {
      let subDoc: any = await ServiceSubCategoryModel.findOne({
        name: sub.name,
        category_id: catDoc._id,
        tenantId,
      });
      if (!subDoc) {
        console.log(`  Új alkategória létrehozása: "${sub.name}"`);
        subDoc = await ServiceSubCategoryModel.create({
          tenantId,
          category_id: catDoc._id,
          name: sub.name,
          sort_order: 0,
          is_active: true,
        });
      } else {
        console.log(`  Létező alkategória: "${sub.name}"`);
      }
      subCatDbMap.set(sub.name, String(subDoc._id));
    }
  }

  const range = xlsx.utils.decode_range(worksheet["!ref"] || "A1:C270");

  let importedCount = 0;
  let updatedCount = 0;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowNum = r + 1;
    const mapping = findCategoryAndSubCategory(rowNum);
    if (!mapping) {
      continue;
    }

    const cellA = worksheet[xlsx.utils.encode_cell({ r, c: 0 })];
    const cellB = worksheet[xlsx.utils.encode_cell({ r, c: 1 })];
    const cellC = worksheet[xlsx.utils.encode_cell({ r, c: 2 })];

    if (!cellA || cellA.v === undefined || cellA.v === null) {
      continue;
    }

    const rawName = String(cellA.v);
    const name = rawName.trim();
    if (!name) continue;

    // Csomagoknál (pl. sor 10) ha nincs megadva egység, akkor "hó" a default, egyébként "db"
    let defaultUnit = "db";
    if (rowNum >= 6 && rowNum <= 13) {
      defaultUnit = "hó";
    }
    const unit =
      cellB && cellB.v !== undefined && cellB.v !== null
        ? String(cellB.v).trim()
        : defaultUnit;

    let price = 0;
    let pricing_type: "fixed" | "custom" = "fixed";

    if (cellC && cellC.v !== undefined && cellC.v !== null) {
      const v = cellC.v;
      if (typeof v === "number") {
        price = v;
        pricing_type = "fixed";
      } else if (String(v).trim().toLowerCase() === "egyedi") {
        price = 0;
        pricing_type = "custom";
      } else {
        const cleaned = String(v).replace(/[^0-9]/g, "");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
          price = parsed;
          pricing_type = "fixed";
        } else {
          price = 0;
          pricing_type = "custom";
        }
      }
    } else {
      price = 0;
      pricing_type = "custom";
    }

    const categoryId = catDbMap.get(mapping.category.name)!;
    const subCategoryId = subCatDbMap.get(mapping.subcategory.name)!;

    // Létező elem ellenőrzése név és kategória szerint
    let item: any = await ServicePriceListItemModel.findOne({
      tenantId,
      name,
      category_id: categoryId,
    });

    if (item) {
      // Frissítés
      item.unit = unit;
      item.internal_base_price = price;
      item.pricing_type = pricing_type;
      item.subcategory_id = subCategoryId;
      await item.save();
      updatedCount++;
    } else {
      // Beszúrás új SKU-val
      const skuPrefix = mapping.category.sku_prefix;
      const counterKey = `service_sku_${skuPrefix}`;
      const n = await nextCounterValue(tenantId, counterKey);
      const sku = formatNumber(skuPrefix, n);

      await ServicePriceListItemModel.create({
        tenantId,
        category_id: categoryId,
        subcategory_id: subCategoryId,
        sku,
        name,
        unit,
        internal_base_price: price,
        pricing_type,
        is_active: true,
        sort_order: 0,
        description: null,
      });
      importedCount++;
      console.log(`Importálva: [${sku}] ${name} - ${price} Ft / ${unit}`);
    }
  }

  console.log(`\nImportálás sikeresen befejeződött!`);
  console.log(`- Létrehozva: ${importedCount} új szolgáltatás`);
  console.log(`- Frissítve: ${updatedCount} meglévő szolgáltatás`);

  await mongooseInstance.disconnect();
}

main().catch(async (err) => {
  console.error("Végzetes hiba az importálás során:", err);
  process.exit(1);
});
