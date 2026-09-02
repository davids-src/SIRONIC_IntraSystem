// SIROTECH Árazási Mátrix V6 → MongoDB frissítő script
// Futtatás: node --experimental-vm-modules update-pricelist-v6.mjs
// Szükséges: MONGODB_URI a .env fájlban (apps/crm/.env)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Script futhat bármely könyvtárból – az env és excel mindig a workspace root-ban van
// Ha NODE_WORKSPACE_ROOT env van beállítva, azt használja; egyébként felfelé keresi a package.json-t
function findWorkspaceRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        // A root package.json-nak van "workspaces" vagy "pnpm-workspace.yaml"
        if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}
const WORKSPACE_ROOT = process.env.NODE_WORKSPACE_ROOT || findWorkspaceRoot(__dirname);

// ---- ENV betöltése ----
const envPath = path.resolve(WORKSPACE_ROOT, "apps/crm/.env");
console.log("Loading environment from:", envPath);
try {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  });
} catch (e) {
  console.error("Error reading env:", e.message);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not set!");
  process.exit(1);
}

// ---- Mongoose sémák (inline, hogy ne kelljen workspace resolution) ----
const counterSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);
counterSchema.index({ tenantId: 1, name: 1 }, { unique: true });
const CounterModel =
  mongoose.models.Counter ||
  mongoose.model("Counter", counterSchema, "counters");

const serviceCategorySchema = new mongoose.Schema(
  {
    tenantId: String,
    name: String,
    icon: String,
    sku_prefix: String,
    color: String,
    sort_order: Number,
    is_active: Boolean,
  },
  { timestamps: true }
);
const ServiceCategoryModel =
  mongoose.models.ServiceCategory ||
  mongoose.model("ServiceCategory", serviceCategorySchema);

const serviceSubCategorySchema = new mongoose.Schema(
  {
    tenantId: String,
    category_id: mongoose.Schema.Types.ObjectId,
    name: String,
    sort_order: Number,
    is_active: Boolean,
  },
  { timestamps: true }
);
const ServiceSubCategoryModel =
  mongoose.models.ServiceSubCategory ||
  mongoose.model("ServiceSubCategory", serviceSubCategorySchema);

const servicePriceListItemSchema = new mongoose.Schema(
  {
    tenantId: String,
    category_id: mongoose.Schema.Types.ObjectId,
    subcategory_id: mongoose.Schema.Types.ObjectId,
    sku: String,
    name: String,
    unit: String,
    internal_base_price: Number,
    pricing_type: { type: String, enum: ["fixed", "custom"] },
    is_active: Boolean,
    is_archived: Boolean,
    sort_order: Number,
    description: String,
  },
  { timestamps: true }
);
const ServicePriceListItemModel =
  mongoose.models.ServicePriceListItem ||
  mongoose.model("ServicePriceListItem", servicePriceListItemSchema);

const tenantSchema = new mongoose.Schema({ name: String }, { timestamps: true });
const TenantModel =
  mongoose.models.Tenant || mongoose.model("Tenant", tenantSchema);

const crmUserSchema = new mongoose.Schema(
  { tenantId: mongoose.Schema.Types.ObjectId, email: String },
  { timestamps: true }
);
const CrmUserModel =
  mongoose.models.CrmUser || mongoose.model("CrmUser", crmUserSchema);

// ---- Segédfüggvények ----
async function nextCounterValue(tenantId, name) {
  const doc = await CounterModel.findOneAndUpdate(
    { tenantId, name },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc?.value ?? 1;
}

function formatNumber(prefix, n) {
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

// ============================================================
// V6 EXCEL STRUKTÚRA (📋 ÁRAZÁSI MÁTRIX sheet):
//   col[0] = A = Szekciófejléc
//   col[1] = B = Tétel neve
//   col[2] = C = Egység
//   col[3] = D = Belső alap ár (Ft) → internal_base_price
// Sorok 1-indexelve (az Excel sor sorszáma)
// ============================================================

const CATEGORY_MAP = [
  {
    name: "IT Rendszerüzemeltetés",
    sku_prefix: "IT",
    color: "#3b82f6",
    subcategories: [
      { name: "Üzemeltetési csomagok", startRow: 7, endRow: 14 },
      { name: "Operációs rendszer és szoftver", startRow: 16, endRow: 27 },
      { name: "IT biztonság", startRow: 29, endRow: 35 },
      { name: "Szerver és infrastruktúra", startRow: 37, endRow: 44 },
      { name: "Monitoring és riportálás", startRow: 46, endRow: 49 },
    ],
  },
  {
    name: "Hálózatépítés és Fejlesztés",
    sku_prefix: "HL",
    color: "#10b981",
    subcategories: [
      { name: "Felmérés és tervezés", startRow: 52, endRow: 56 },
      { name: "Router, Internet és VPN", startRow: 58, endRow: 63 },
      { name: "Wi-Fi és strukturált kábelezés", startRow: 65, endRow: 71 },
      { name: "IP telefónia", startRow: 73, endRow: 75 },
    ],
  },
  {
    name: "Weboldal és Fejlesztés",
    sku_prefix: "WB",
    color: "#8b5cf6",
    subcategories: [
      { name: "Egyedi fejlesztés", startRow: 79, endRow: 84 },
      { name: "WordPress fejlesztés és karbantartás", startRow: 86, endRow: 94 },
      { name: "Domain és tárhely", startRow: 96, endRow: 98 },
      { name: "SEO és analitika", startRow: 99, endRow: 99 },
    ],
  },
  {
    name: "Szervíz és Javítás",
    sku_prefix: "SZ",
    color: "#f59e0b",
    subcategories: [
      { name: "Szoftveres javítások", startRow: 103, endRow: 107 },
      { name: "Hardveres javítások (PC/Laptop)", startRow: 109, endRow: 117 },
      { name: "Mobil eszközök javítása", startRow: 119, endRow: 126 },
    ],
  },
  {
    name: "NIS2 Megfelelés",
    sku_prefix: "N2",
    color: "#ef4444",
    subcategories: [
      { name: "NIS2 Megfelelés és audit", startRow: 129, endRow: 132 },
      { name: "Adatvédelem és tréningek", startRow: 133, endRow: 135 },
    ],
  },
  {
    name: "Biztonságtechnika",
    sku_prefix: "BT",
    color: "#6366f1",
    subcategories: [
      { name: "CCTV – Kamerarendszerek", startRow: 139, endRow: 153 },
      { name: "Riasztórendszer", startRow: 155, endRow: 168 },
      { name: "Beléptető rendszer", startRow: 170, endRow: 173 },
    ],
  },
  {
    name: "Tűzjelző Rendszer",
    sku_prefix: "TJ",
    color: "#ec4899",
    subcategories: [
      { name: "Tűzjelző telepítés", startRow: 177, endRow: 185 },
      { name: "Tűzjelző karbantartás", startRow: 188, endRow: 194 },
    ],
  },
  {
    name: "Tűzvédelem",
    sku_prefix: "TV",
    color: "#f43f5e",
    subcategories: [
      { name: "Tűzvédelmi tanácsadás és passzív tűzvédelem", startRow: 197, endRow: 204 },
    ],
  },
  {
    name: "Épületvillamosság",
    sku_prefix: "VL",
    color: "#f59e0b",
    subcategories: [
      { name: "Tervezés és felmérés", startRow: 208, endRow: 211 },
      { name: "Általános villanyszerelés", startRow: 213, endRow: 218 },
      { name: "EV töltő telepítés", startRow: 220, endRow: 224 },
      { name: "Épületautomatizálás", startRow: 226, endRow: 227 },
      { name: "Ipari villamos munkák", startRow: 229, endRow: 231 },
    ],
  },
  {
    name: "Projekt Megbízott",
    sku_prefix: "PM",
    color: "#6b7280",
    subcategories: [
      { name: "Projektmenedzsment és műszaki felügyelet", startRow: 234, endRow: 239 },
    ],
  },
];

function findCategoryAndSubCategory(rowNum) {
  for (const cat of CATEGORY_MAP) {
    for (const sub of cat.subcategories) {
      if (rowNum >= sub.startRow && rowNum <= sub.endRow) {
        return { category: cat, subcategory: sub };
      }
    }
  }
  return null;
}

// ---- FŐPROGRAM ----
async function main() {
  const excelPath = path.resolve(WORKSPACE_ROOT, "SIROTECH_Arazasi_Matrix_V6.xlsx");
  console.log("Excel elérési útja:", excelPath);
  if (!fs.existsSync(excelPath)) {
    console.error("Hiba: Az Excel fájl nem található:", excelPath);
    process.exit(1);
  }

  const workbook = xlsx.readFile(excelPath);
  const sheetName = "📋 ÁRAZÁSI MÁTRIX";
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    console.error(`Hiba: A '${sheetName}' munkalap nem található!`);
    console.error("Elérhető lapok:", workbook.SheetNames);
    process.exit(1);
  }

  console.log("Kapcsolódás az adatbázishoz:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Adatbázis kapcsolat létrejött!");

  // Tenant keresése
  const user = await CrmUserModel.findOne().lean();
  let tenantId = "";
  let tenantName = "";

  if (user && user.tenantId) {
    tenantId = String(user.tenantId);
    const tenantDoc = await TenantModel.findById(tenantId).lean();
    tenantName = tenantDoc ? tenantDoc.name : "Ismeretlen bérlő";
  } else {
    const tenant = await TenantModel.findOne().lean();
    if (!tenant) {
      console.error("Hiba: Nem található bérlő (Tenant) az adatbázisban!");
      await mongoose.disconnect();
      process.exit(1);
    }
    tenantId = String(tenant._id);
    tenantName = tenant.name;
  }

  console.log(`\nCél bérlő: ${tenantName} (${tenantId})`);

  // Kategóriák és alkategóriák létrehozása/ellenőrzése
  const catDbMap = new Map();
  const subCatDbMap = new Map();

  console.log("\n--- Kategóriák szinkronizálása ---");
  for (const cat of CATEGORY_MAP) {
    let catDoc = await ServiceCategoryModel.findOne({ name: cat.name, tenantId });
    if (!catDoc) {
      catDoc = await ServiceCategoryModel.findOne({ sku_prefix: cat.sku_prefix, tenantId });
    }

    if (!catDoc) {
      console.log(`  [ÚJ] Kategória: "${cat.name}" (SKU: ${cat.sku_prefix})`);
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
      let changed = false;
      if (catDoc.name !== cat.name) { catDoc.name = cat.name; changed = true; }
      if (catDoc.color !== cat.color) { catDoc.color = cat.color; changed = true; }
      if (changed) {
        await catDoc.save();
        console.log(`  [FRISSÍTVE] Kategória: "${cat.name}"`);
      } else {
        console.log(`  [OK] Kategória: "${cat.name}"`);
      }
    }
    catDbMap.set(cat.name, String(catDoc._id));

    for (const sub of cat.subcategories) {
      let subDoc = await ServiceSubCategoryModel.findOne({
        name: sub.name,
        category_id: catDoc._id,
        tenantId,
      });
      if (!subDoc) {
        console.log(`    [ÚJ] Alkategória: "${sub.name}"`);
        subDoc = await ServiceSubCategoryModel.create({
          tenantId,
          category_id: catDoc._id,
          name: sub.name,
          sort_order: 0,
          is_active: true,
        });
      }
      subCatDbMap.set(sub.name, String(subDoc._id));
    }
  }

  // Tételek feldolgozása
  console.log("\n--- Árlistatételek feldolgozása ---");
  const range = xlsx.utils.decode_range(worksheet["!ref"] || "A1:K270");

  let importedCount = 0;
  let updatedCount = 0;
  let priceChangedCount = 0;
  let skippedCount = 0;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowNum = r + 1; // 1-indexed
    const mapping = findCategoryAndSubCategory(rowNum);
    if (!mapping) {
      continue;
    }

    // V6: col[1]=B=Tétel neve, col[2]=C=Egység, col[3]=D=Belső alap ár
    const cellB = worksheet[xlsx.utils.encode_cell({ r, c: 1 })];
    const cellC = worksheet[xlsx.utils.encode_cell({ r, c: 2 })];
    const cellD = worksheet[xlsx.utils.encode_cell({ r, c: 3 })];

    if (!cellB || cellB.v === undefined || cellB.v === null) {
      skippedCount++;
      continue;
    }

    const name = String(cellB.v).trim();
    if (!name || name.startsWith("Szorzók") || name === "→") {
      skippedCount++;
      continue;
    }

    const unit =
      cellC && cellC.v !== undefined && cellC.v !== null
        ? String(cellC.v).trim()
        : "db";

    let price = 0;
    let pricing_type = "fixed";

    if (cellD && cellD.v !== undefined && cellD.v !== null) {
      const v = cellD.v;
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

    const categoryId = catDbMap.get(mapping.category.name);
    const subCategoryId = subCatDbMap.get(mapping.subcategory.name);

    // Meglévő elem keresése
    let item = await ServicePriceListItemModel.findOne({
      tenantId,
      name,
      category_id: categoryId,
    });

    if (item) {
      const oldPrice = item.internal_base_price;
      item.unit = unit;
      item.internal_base_price = price;
      item.pricing_type = pricing_type;
      item.subcategory_id = subCategoryId;
      await item.save();
      updatedCount++;
      if (oldPrice !== price) {
        priceChangedCount++;
        console.log(`  [ÁR ↑] [${item.sku}] "${name}": ${oldPrice} → ${price} Ft / ${unit}`);
      }
    } else {
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
        is_archived: false,
        sort_order: 0,
        description: null,
      });
      importedCount++;
      console.log(`  [ÚJ] [${sku}] "${name}" – ${price} Ft / ${unit}`);
    }
  }

  console.log("\n=== ÖSSZEFOGLALÓ ===");
  console.log(`Cél bérlő:          ${tenantName}`);
  console.log(`Létrehozva (ÚJ):    ${importedCount} tétel`);
  console.log(`Frissítve:          ${updatedCount} tétel`);
  console.log(`  ebből ár változott: ${priceChangedCount}`);
  console.log(`Kihagyva (fejléc):  ${skippedCount} sor`);
  console.log("====================\n");

  await mongoose.disconnect();
  console.log("Kész! Adatbázis kapcsolat lezárva.");
}

main().catch(async (err) => {
  console.error("Végzetes hiba:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
