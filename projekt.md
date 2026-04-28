04_28

Hol tart most
Monorepo felállt (apps/*, packages/*, Turbo, pnpm workspace, strict TS baseline).
Két Next app fut:
apps/crm
apps/partner-portal
Látható UI shell kész mindkettőben:
bal oldali menü
felső sáv
route-váz oldalak (Dashboard, Inventory, Offers, stb.)
RBAC alap motor kész (packages/rbac) role + scope ellenőrzéssel.
Domain alapok készültek:
packages/types (core type-ok)
packages/lib inventory alaplogika (SKU generálás, validáció)
Tesztelés elindítva:
Jest setup
inventory unit tesztek futnak és zöldek
CI/CD és hook alapok bent vannak:
Husky pre-commit / pre-push
GitHub workflow-k (CI + main image build)
Mi NINCS még kész
nincs még valódi adatbázis bekötés (Mongoose model + repository + API route-ok végig)
nincs auth integráció (NextAuth/Clerk még nincs kiválasztva és implementálva)
nincs valódi CRUD UI (most placeholder oldalak vannak)
nincs tényleges ajánlat-generálási workflow
nincs teljes RBAC enforcement minden route/page szinten
nincs shadcn teljes komponensrendszer felhúzva (jelenleg inkább alap UI scaffold)
Fontos technikai megjegyzés
A turbo run dev nálad jelenleg hibázik (cannot find binary path), ezért apponként indítjuk a dev szervert külön paranccsal.
Reális státusz címke
Stage: Foundation / Architecture Bootstrap
Készültség érzésre: kb. 20-30% az első valódi usable MVP-hez.
Ha kéred, következő körben adok egy konkrét, 1-2 napos sprintet és megcsinálom az első “valódi” modult: Inventory CRUD + Mongo + RBAC guard + list/detail oldalak.