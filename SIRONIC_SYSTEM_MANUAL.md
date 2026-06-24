# SIRONIC IntraSystem – Komplex Rendszerterv és Technikai Kézikönyv

Ez a dokumentum a SIRONIC IntraSystem teljes körű, mikroszkopikus szintű technikai, funkcionális és dizájn-leírása. Részletezi az adatbázis-kapcsolatokat, az összetett tranzakciós műveleteket, a biztonsági eljárásokat, a végfelhasználói munkafolyamatokat, valamint a felhasználói felület (UI/UX) felépítését.

> **Fejlesztői Szabályzat:** A `.cursor/rules/rules.md` értelmében minden új funkció, adatbázis entitás vagy UI módosítás esetén ezt a fájlt kötelező mikroszkopikus pontossággal frissíteni!

---

## 1. Rendszerarchitektúra és Alapelvek

A rendszer egy modern, TypeScript alapú **Monorepo** architektúrára épül (Turborepo), amely különálló, de egymással integrált alkalmazásokat tartalmaz:

1. **CRM App (`apps/crm`)**: A belső munkatársak Next.js alapú rendszere (Server Components, App Router).
2. **Partner Portál (`apps/partner-portal`)**: Az ügyfelek Next.js alapú önkiszolgáló felülete.
3. **Közös Csomagok (`packages/*`)**: Típusok, adatbázis modellek (`@crm/db`), autentikáció, UI komponensek (`@crm/ui`, shadcn/ui alapon) és RBAC (jogosultságkezelés).

### 1.1. Több-bérlős (Multi-tenant) Adatbázis Modell

A MongoDB adatbázisban minden egyes gyűjtemény (Collection) összes dokumentuma tartalmaz egy `tenantId` mezőt. A rendszer API végpontjai kivétel nélkül egy közös wrapperen (`requireCrmAuth` / `requirePortalActor` és `withDb`) keresztül határozzák meg a kérést indító felhasználó `tenantId`-ját. Minden adatbázis-lekérdezés (`find`, `findOne`, `update`) kötelezően szűr erre az azonosítóra, fizikai adatszivárgás-védelmet biztosítva.

### 1.2. Jogosultságkezelés (RBAC)

A jogosultságokat az `ActorContext` ellenőrzi. A szerepkörök (`RoleKey`: `crm.admin`, `crm.staff`, `partner.admin`, `partner.viewer`) statikusan le vannak képezve granuláris jogosultságokra a `packages/rbac` modulban.
A jogosultság 3 dimenziós:

- **Modul:** pl. `worklog`, `ticket`, `secret`, `weekly_plan`
- **Akció:** pl. `view`, `write`, `manage`
- **Hatókör (Scope):** `global` (CRM szint, mindenhez is), `contact` (csak a saját partneradatok), `resource` (csak a saját maga által létrehozott entitás).

### 1.3. Tranzakciók a Mongoose-ban (`withDb`)

Összetett adatbázis műveletek (pl. szállítólevél kiadása készletcsökkentéssel, sorszám generálása) MongoDB **ACID tranzakciókon** (Session) keresztül történnek. A kód egy `await withDb(async (session) => { ... })` wrapperben fut, biztosítva, hogy részleges meghibásodás (pl. API hiba vagy készlethiány) esetén a teljes művelet visszaguruljon (rollback), elkerülve az inkonzisztens állapotokat.

---

## 2. Felhasználói Felület és Dizájn (UI/UX)

A SIRONIC dizájnrendszere (`@crm/ui`) a shadcn/ui és a Tailwind CSS kombinációjára épül, sötét és világos mód támogatással. A cél a letisztult, "glassmorphism" elemeket nyomokban tartalmazó, modern, SaaS-szerű kinézet.

### 2.1. CRM Felület (`apps/crm`) Layout

- **Oldalsáv (Sidebar):** Bal oldalon fix, összecsukható (collapsible) sötét tónusú menüsáv. Itt kapnak helyet a fő modulok: Műszerfal, Partnerek, Hibajegyek, Munkalapok, Igazolások, Raktár, Pénzügy, Jótállási jegyek, Titoktár, Beállítások.
- **Fejléc (Header):** Keresősáv (Global Search), Értesítések (csengő ikon), és Felhasználói profil (Dropdown a kijelentkezéshez és a témaválasztáshoz).
- **Tartalmi Terület (Main Content):**
  - **Lista nézetek (DataTables):** Teljes szélességű táblázatok, felül komplex szűrősávval (Faceted Search), keresőmezővel és tömeges művelet gombokkal. A lapozás (Pagination) alul található.
  - **Kártya elrendezés (Cards):** Részletes nézeteken (Detail Pages) a tartalmak logikai blokkokba (Card komponens) vannak rendezve, finom árnyékokkal (shadow-sm) és border-rel.
  - **Oldalpanelek (Slide-overs / Sheets):** Új elemek gyors létrehozása (pl. gyors hibajegy rögzítés) gyakran egy jobb oldalról becsúszó panelen történik a kontextus elvesztése nélkül.

### 2.2. Partner Portál (`apps/partner-portal`) Layout

Az ügyfélélményre fókuszáló, "sandbox" környezet.

- **Belépőoldal (Login):** Vállalati branding, letisztult, egykártyás elrendezés. Szigorúan független a CRM login-tól.
- **Felső Navigáció (Top Navbar):** Kisebb menü, amely vízszintesen helyezkedik el. Menüpontok: Műszerfal, Hibajegyek, Munkalapok, Pénzügy, Jótállás, Dokumentumok.
- **Műszerfal (Dashboard):** Widget alapú (Grid layout). Kártyák mutatják a folyamatban lévő projektek állapotát (Progress bar-okkal), az aktív hibajegyeket és a figyelmet igénylő (aláírandó) Teljesítésigazolásokat.
- **Reszponzivitás:** A UI komponensek mobiltelefonokon (pl. terepen lévő ügyfél számára hibajegy leadásához) teljesen mobil-optimalizált (Stack-elt) nézetre váltanak.

---

## 3. Adatbázis Entitások, Indexek és Kapcsolatok (ERD)

Minden entitas UUID-t (`_id`) vagy MongoDB ObjectID-t hasznal elsodleges kulcskent. A hivatkozasok (Foreign Keys) string alapuak (pl. `contact_id`).

### 3.0. Globalis Archivalasi Mezok

A rendszer minden fo entitason (Offer, Worklog, Ticket, Project, DeliveryNote, CompletionCertificate, PurchaseOrder, PriceListItem) egyseges **soft-delete / archivalasi** mechanizmust alkalmaz. Minden erintett Mongoose sema tartalmazza a kovetkezo harom opcionalis mezot:

- `is_archived` (`Boolean`, default: `false`) - Jelzi, hogy az adott rekord archivaltnak tekintendo-e.
- `archived_at` (`Date`, opcionalis) - Az archivalas pontos idobelyege.
- `archive_reason` (`String`, opcionalis) - A felhasznalo altal megadott archivalasi indok (pl. "Elavult", "Duplikatum", "Ugyfel lemondta").

Ezek a mezok a schema definicioban `required: false` jelzessel szerepelnek, es **nem befolyasoljak a meglevo dokumentumokat** - a migraciomentesseg biztositott, mivel a `$ne: true` szures a `null`/`undefined` ertekeket is kiszuri.

### 3.1. Partnerek (Contact)

- **Mezők:** `type` (company/individual/one_time), címadatok (székhely és számlázási), kapcsolattartók tömbje (név, email, tel).
- **UI/UX:** A Partner részletes nézete egy fül-vezérelt (Tabs) felület, ahol a "Hibajegyek", "Munkalapok", "Projektek", "Titkok" és "Pénzügy" külön lapokon tekinthetők meg anélkül, hogy az oldalt újra kellene tölteni.

### 3.2. Projektek (Project)

- **Mezők:** `contact_id` (N:1), `phases` (fázisok határidőkkel és %-os készültséggel), `checklist` (feladatok kötelező csatolmány validációval).
- **UI/UX:** Vizuális Kanban-szerű fázis-kijelzés. A `staging_links` egy kártyán jelenik meg kis "Külső hivatkozás" (External Link) ikonokkal. A projekt láthatósága a portálon egy Switch (Toggle) gombbal kapcsolható be/ki.

### 3.3. Hibajegyek és Munkalapok (Ticket & Worklog)

- **Ticket:** Olyan `comments` tombot tartalmaz, ahol minden uzenet objektum. Ha az `is_internal: true`, a Partner Portalon nem jelenik meg, es a CRM UI-on a megjegyzes egy sargas hatteru ("Internal Note") stilust kap. Tamogatja az archivalasi mezoket (ld. 3.0).
- **Worklog:** `items` tomb hivatkozik a `PriceListItem`-re. Tarolja az alairasokat Data URI formatumban (`client_signature`). Tamogatja az archivalasi mezoket (ld. 3.0).
- **UI/UX:** A Munkalap urlapon a tetelek felvitele dinamikus sor-hozzaadassal tortenik (Field Array). A digitalis alairas rogzitesehez egy HTML5 Canvas alapu "Signature Pad" komponens nyilik meg modalisan (Dialog). Mindket lista nezetben elerheto az "Archivalt elemek megjelenitese" szuro toggle es az archiv/visszaallito muveleti gombok.

### 3.4. Raktár és Készlet (Warehouse, PriceListItem, StockItem)

- **PriceListItem:** Raktározható (`product`) vagy virtuális (`service`, `labor`) tételek. Titkos mezője a `purchase_records` (beszállítói adatok). A kódgenerálás Prefix-alapú (pl. "HW-").
- **StockItem:** `price_list_item_id` alapú készlet-nyilvántartás. A fizikai készlet (`quantity_in_stock`) mellett tartalmazza a lefoglalt készletet (`quantity_allocated`) is. A szabad készletet a `quantity_in_stock - quantity_allocated` képlet határozza meg. A foglalási történet (projektek száma, lefoglalt db, leírások) a `notes` mezőben halmozódik auditálható formában.
- **UI/UX:** A Raktár nézet bal oldalán a Raktárhelyek (fa-struktúra szerű mappa-nézet) listája, jobb oldalon a szűrt Készlet (StockItems) táblázata látható. A bevételezés egy több-lépéses (Wizard) modál ablakban történik. A készletfoglalás a sorok melletti foglalás (User) gombra kattintva, egy modális ablakon keresztül érhető el.
- **Leltározási modul:** A raktári navigációból nyitható meg. Egy tárhely (`warehouse_location`) kiválasztása után betölti a hozzárendelt összes cikket. A fizikai darabszám bevitelekor a rendszer automatikusan számolja az eltérést (különbözetet) a várt mennyiséghez képest, és lehetőséget ad az eltérés indoklásának megadására. A lezárás gombra kattintva a készlet korrigálásra kerül, és tranzakciós naplóbejegyzés készül.
- **Raktár Műszerfal (Dashboard):** A raktár főoldalán megjelenő KPI mutatók (teljes készletérték, alacsony készletszintű cikkek száma, aktív RMA ügyek, tárhelyek száma), tárhely-készletérték eloszlások (százalékos csíkkal, kiemelve a legnagyobb értékű tárhelyet), kritikus szintű cikkek listája, elfekvő készletek (Dead Stock - 90 napja nem mozgó tételek) listája és a legutóbbi tranzakciók táblázata.

### 3.5. Heti tervek (WeeklyPlan)

- **Mezők:** `assignee_id` (CrmUser hivatkozás), `week_number` (ISO hét), `year` (év), `title` (cím), `description` (leírás), `status` (todo, in_progress, done, blocked), `priority` (low, medium, high, urgent), `due_date` (határidő, Date pickerrel), `ticket_id` (opcionális N:1 kapcsolat), `project_id` (opcionális N:1 kapcsolat), `worklog_id` (opcionális N:1 kapcsolat). Támogatja az archiválási mezőket (ld. 3.0).
- **Indexek:** Összetett index (`assignee_id: 1`, `year: 1`, `week_number: 1`) a heti tervek gyors lekéréséhez és szűréséhez.
- **UI/UX:** Vizuális Kanban tábla, amely támogatja a heti és éves navigációt, a felelős és az archivált szűrőket, valamint a kártyák közötti gyors állapot-mozgatást nyilakkal.

---

## 4. Technikai Munkafolyamatok és Tranzakciók (Mikroszkopikus bontás)

### 4.1. Készletmozgás és Szállítólevelek (Delivery Notes)

A raktárkészlet fizikai mozgását a rendszer **Event Sourcing** jellegű tranzakciós naplókkal (`StockTransaction`) kezeli.
**API Folyamat: Szállítólevél kiadása (`PATCH /api/delivery-notes/:id`)**

1. A JSON body: `{ status: "issued" }`.
2. A backend elindít egy Mongoose Tranzakciót (`session.startTransaction()`).
3. Végigiterál a szállítólevél minden tételén (`lines`). Lekéri a `PriceListItem` és ahhoz tartozó `StockItem` adatokat egy `find({ ... }).session(session)` hívással (Read Lock prevenció).
4. Ha a `quantity_in_stock < kért_mennyiség`, a tranzakció `abortTransaction()` hívással megszakad, az API `400 Bad Request` ("Nincs elég készlet a(z) XY termékből") hibát dob az UI-nak.
5. Megfelelő készlet esetén létrehoz egy `StockTransaction` rekordot (`type: "out"`, `reference_type: "delivery_note"`, `reference_id: <delivery_note_id>`, `quantity: -kért_mennyiség`). Ezt `save({ session })` hívással menti.
6. A `StockItem` gyűjteményben a készletet a MongoDB atomi operátorával csökkenti: `updateOne({ ... }, { $inc: { quantity_in_stock: -kért_mennyiség } }, { session })`.
7. Frissíti a Szállítólevél állapotát `issued`-re.
8. Tranzakció Commit (`commitTransaction()`).
   **UI Működés:** A felhasználó a "Kiadás" gombra kattint (ami betöltődik/disabled lesz, hogy megelőzze a dupla kattintást), és a sikeresség után egy Toast értesítést (zöld "Sikeres mentés") kap.

> **Megjegyzés - Soft-Delete:** A szállítólevél `DELETE` végpontja **nem törli véglegesen** a dokumentumot, hanem `is_archived: true` állapotba helyezi (ld. 4.6. fejezet). Kiadott (`issued`) szállítólevél továbbra sem archivált közvetlenül - előbb sztornózni szükséges.

### 4.2. Titoktár (Secrets) Kriptográfiai Folyama

Szenzitív adatok (pl. adatbázis jelszavak az ügyfelek projektjéhez) mentése banki szintű biztonsággal.
**Titkosítás menete (Létrehozáskor):**

1. A backend a beépített `crypto` modult használja (`crypto.createCipheriv('aes-256-gcm', key, iv)`).
2. Generál egy 16 bájtos Initialisation Vectort (`crypto.randomBytes(16)`).
3. Titkosítja a kapott plaintextet a szerver környezeti változójában (`SECRETS_ENCRYPTION_KEY`) lévő 32 bájtos Master Key segítségével.
4. Az eredményt és a GCM Auth Tag-et összefűzi `iv.toString('hex') + ':' + authTag.toString('hex') + ':' + ciphertext.toString('hex')` formátumban, és ezt a String-et menti a MongoDB-be. A plaintext string a szemétgyűjtő (Garbage Collector) által kitörlődik a memóriából.
   **Visszafejtés (Megtekintéskor az UI-on):**
5. A List API **szándékosan kiveszi** a válaszból az `encrypted_value` mezőt (`.select('-encrypted_value')`). Az UI egy táblázatot mutat a kulcsnevekkel, de maga az érték a böngésző memóriájában sincs jelen.
6. A felhasználó a Szem (View) ikonra kattint. Ez egy egyedi kérést küld a `POST /api/secrets/:id/reveal` végpontra.
7. A szerver letölti az `encrypted_value`-t, szétszedi a ':' mentén. Készít egy Decipher objektumot, betölti az AuthTag-et, és visszafejti az adatot. Ha az AuthTag nem egyezik (adatbázis manipuláció), a kérés `500 Decryption failed` hibával elszáll.
8. Siker esetén a plaintext visszamegy a frontendnek.
9. Az UI-on az érték megjelenik egy Input mezőben egy Másolás (Clipboard) gomb kíséretében, de egy `setTimeout` 10 másodperc után automatikusan kicseréli a stringet `**********`-ra a memóriában és a kijelzőn is.

### 4.3. Jótállási Jegyek (Warranties) Auto-Számláló és Kliens PDF

Számlafüggetlen, önálló dokumentum.
**Tranzakciós Sorszámozás:**
Új jótállás létrehozásakor a rendszer a `packages/db/src/counter.ts`-ben definiált mechanizmust használja: Egy `findOneAndUpdate` operáció a `counters` gyűjteményen atomi `$inc` utasítással megnöveli a számlálót, majd visszaadja a számot, amit a rendszer azonnal megformáz (pl. `JJY-000042`). Ez a MongoDB natív lezárása miatt race-condition mentes (több párhuzamos kérés sem kapja ugyanazt a sorszámot).
**Kliens oldali (Böngészős) PDF Generálás (`html2pdf.js`):**

1. A felhasználó rákattint a "PDF letöltése" gombra. A gomb betöltő (Spinner) állapotba kerül.
2. A frontend lekéri (`/api/warranties/:id/pdf-data`) a jótállás részleteit, a partner címét, és a Rendszerbeállításokból a cégadatokat (székhely, email) valamint a Markdown-szerű **szerkeszthető Jogi Tájékoztatót**.
3. A frontend kódban egy rejtett, de fizikailag létező HTML stringet állít össze inline CSS stílusokkal. A HTML tartalmazza:
   - Fejléc (Cégadatok + Jótállási szám).
   - Másodperc alapú, mikroszkopikus szürke betűs digitális hitelesítő időbélyeg (_"Generálva: YYYY.MM.DD HH:mm:ss - Hiteles digitális másolat"_).
   - Termék táblázat (Név, Gyári szám, Jótállás éve, Kezdete, Lejárata).
   - 2. Oldal: A Jogi Tájékoztató parse-olt HTML változata.
4. Ezt az összeállított (Template Literal) stringet adja át a `.from(html)` metódusnak. A `html2pdf.js` a memóriában rendereli le a dom-ot Canvas-ra (2x Scale, A4, Jpeg minőséggel), majd felugrik a Letöltés ablak a kliens gépén (`Jótállási_jegy_JJY-000042.pdf`). A szerver ezen nem dolgozik egy percet sem, a szerver CPU kímélve marad.

### 4.4. Teljesítésigazolások (Completion Certificates) Munkafolyamata

Egy vagy több hibajegy, munkalap, projekt vagy egyedi tételek pénzügyi és műszaki lezárása.

1. **Adatok importálása és tételes sorok kezelése:**
   - A teljesítésigazolás összeállításakor a belső munkatársak importálhatnak adatokat meglévő forrásokból: Ajánlatokból (automatikus tétel- és cím-importálás), Munkalapokból (felhasznált anyagok és munkadíjak átemelése tételes sorokként), illetve Projektekből.
   - A rendszer támogatja az egyedi tételes line-itemeket (`lines`), amelyeknél megadható a megnevezés, mennyiség, egység, valamint a nettó egységár. A tételek manuálisan is felvihetők, vagy a beépített árlistából (`PriceListItem`) tallózhatók.
2. **E-mail értesítés és kiküldés:**
   - A teljesítésigazolás státuszának `sent`-re állításakor egy renderelt React-email sablon kimegy a megadott vevői kapcsolattartónak. Az e-mail tartalmaz egy egyedi hozzáférési linket (Magic Link), amely a Partner Portál megfelelő részletező oldalára irányítja az ügyfelet.
3. **Partner Portál jóváhagyási felület (Sign-off Portal):**
   - Az ügyfél a portálon egy letisztult, esztétikus táblázatban látja a teljesített tételeket, az egységárakat és a nettó végösszeget. A belső CRM-specifikus adatok (pl. beszerzési árak, belső adminisztratív jegyzetek) le vannak szűrve az API szinten.
   - **Elfogadás:** Az ügyfél megadja az aláíró nevét, beosztását, és egy HTML5 Canvas alapú, reszponzív (egér és érintőképernyő-támogatással rendelkező) Signature Pad mezőbe rajzolja az aláírását. A küldéskor a rendszer Base64 formátumú PNG képként (`client_signature`), az aláírás időbélyegével (`signed_at`), valamint a státusz `accepted`-re állításával menti el az adatokat.
   - **Elutasítás:** Amennyiben a teljesítés nem elfogadható, az ügyfél megadja az elutasítás okát (`rejection_reason`), amivel a státusz `rejected` lesz. A megadott indoklás azonnal megjelenik a CRM-ben a dokumentum tetején piros figyelmeztető kártyaként, lehetővé téve a gyors korrekciót.
4. **PDF Generálás és Hitelesítés:**
   - A `html2pdf.js` könyvtár segítségével a frontend a háttérben legenerálja az igazolást. Az aláírt bizonylaton automatikusan megjelenik a vevő képviselőjének hiteles digitális aláírásképe, a beosztása, a dátum, valamint a kiállító hitelesítő adatai.
5. **Pénzügyi Műszerfal (Dashboard):**
   - A teljesítésigazolások listájának tetején egy vizuális dashboard jeleníti meg a kulcsfontosságú pénzügyi és mennyiségi mutatókat (KPI):
     - **Aláírt Igazolások Értéke (Ft):** Az összes elfogadott (`accepted`) igazolás nettó végösszege.
     - **Függőben lévő Érték (Ft):** Az aláírásra kiküldött (`sent`) igazolások nettó összege.
     - **Statisztikai darabszámok:** Az egyes státuszokban (Aláírt, Aláírásra vár, Elutasítva, Piszkozat) lévő bizonylatok darabszáma.

### 4.5. Pénzügyi Szinkronizáció (Billingo Integráció)

Amikor a Számla (Invoice) elkészül, a rendszer a külső szolgáltatóhoz (Billingo) HTTP kérést intéz. A `reference_id` (a belső UUID) a Billingo partner-metaadatokba kerül. A rendszer támogat Webhook végpontokat (`/api/webhooks/billingo`), amelyek aláírás-ellenőrzéssel (HMAC-SHA256) hitelesítik, hogy a kérés tényleg a Billingotól jön. Ha a számlát kifizetik, a Webhook feldolgozó (ami a tranzakción kívül, de aszinkron módon működik) átállítja a belső `Invoice.status` értékét `paid`-re, és automatikus Socket (vagy polling) jelzést küld az UI-nak a Műszerfal frissítésére.

---

### 4.6. Globalis Archivalas es Soft-Delete Mechanizmus

A rendszer 7 fo modulja (Ajanlatok, Munkalapok, Ticketek, Projektek, Szallitolevelek, Teljesitesi Igazolasok, Megrendelolapok) egyseges archivalasi munkafolyamatot kovet.

**API Szintu Mukodes:**

1. **GET lista szures:** Alapertelmezeskent a `GET /api/<modul>` vegpontok kiszurik az archivalt rekordokat (`{ is_archived: { $ne: true } }`). Az `?include_archived=true` query parameterrel a kliens visszakaphatja az archivalt elemeket is.
2. **PATCH archivalas:** A `PATCH /api/<modul>/:id` vegponton a kliens elkuldheti a `{ is_archived: true, archived_at: <ISO Date>, archive_reason: "<indok>" }` mezoket. A visszaallitashoz: `{ is_archived: false, archived_at: null, archive_reason: null }`.
3. **DELETE -> Soft-Delete:** A `DELETE /api/<modul>/:id` vegpont **nem hajtja vegre a dokumentum fizikai torleset**. Ehelyett `findOneAndUpdate` hivassal `is_archived: true` allapotba helyezi a rekordot, az archivalas okat a `?reason=<ok>` query parameterbol vagy alapertelmezett "Torolve" ertekbol veszi.

**Frontend Feluleti Elemek (minden erintett lista nezeten egyseges):**

- **"Archivalt elemek megjelenitese" toggle:** Checkbox a szurosavban; ha bekapcsolt, a lista ujratoltodik `?include_archived=true` parameterrel.
- **Archiv gomb (Archive ikon, piros):** Minden nem-archivalt sor muveleti cellajaban megjelenik. Kattintasra egy modalis parbeszedalblak nyilik, amelyben a felhasznalonak kotelezo kitoltenie az "Archivalas oka" mezot. A "Megse" gomb bezarja a modalt, az "Archivalas" gomb elkuldi a PATCH kerest.
- **Visszaallitas gomb (RotateCcw ikon, szurke):** Archivalt soroknal jelenik meg a piros archiv ikon helyett. Kattintasra egy `confirm()` dialogust kovet a PATCH keres `is_archived: false` adatokkal.
- **Archivalt badge:** Az archivalt rekordok az azonosito oszlopban piros "Archivalt" badge-et kapnak a gyors vizualis megkulonbozteteshez.

**Specialis modul-viselkedes:**

| Modul         | Specialis szabaly                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Szallitolevel | Kiadott (`issued`) szallitolevel DELETE nem engedelyezett - elobb sztornora kell allitani. Sztornozott/piszkozat szallitolevel archivalt allapotu modositasa (PATCH `is_archived`) engedelyezett, meg ha a statusz `cancelled`. |
| Megrendelolap | A PATCH Zod semaja kibovult az `is_archived`, `archived_at`, `archive_reason` mezokkel, igy a validacio nem utasitja el az archivalasi kereseket. A DELETE handler is hozzaadva.                                                |
| Arlista       | Az arlista archivalas a korabbi, dedikalt `is_active: false` + archiv UI megoldassal mukodik (ld. Modul 1.2), de a sema szinten tartalmazza az `is_archived` mezot a globalis konzisztencia erdekeben.                          |

### 4.7. Heti tervek (Weekly Planner) Munkafolyamata és Jogosultságai

A belső munkatársak heti feladatainak hatékony követésére és menedzselésére szolgáló modul.

1. **Jogosultsági és delegálási szabályok:**
   - **`crm.admin`:** Bármely munkatárs heti tervét láthatja, módosíthatja, újat hozhat létre számukra (delegáció), illetve véglegesen vagy soft-delete formában törölheti/archiválhatja azokat.
   - **`crm.staff`:** Bármely munkatárs heti terveit megtekintheti (olvasási jog koordinációhoz), de módosítani és újat létrehozni **kizárólag saját maga számára** tud (`assignee_id === actor.actorId`). Az API végpontok (`POST`, `PATCH`, `DELETE`) szigorúan ellenőrzik ezt a feltételt, és nem engedélyezik a jogosulatlan módosítást (403 Forbidden).
2. **Entitás kapcsolatok kezelése:**
   - A tervek opcionálisan összekapcsolhatók hibajegyekkel (`ticket_id`), projektekkel (`project_id`) és munkalapokkal (`worklog_id`).
   - A Kanban kártyákon ezek a kapcsolatok közvetlen hivatkozásként jelennek meg, lehetővé téve a gyors navigációt az érintett modulok részletes nézeteire.
3. **Soft-delete (Archiválás):**
   - Törlés gombra kattintva a rendszer egy megerősítő modálban bekéri az archiválás okát (`archive_reason`), majd a dokumentumot soft-delete módon archiválja (`is_archived: true`, `archived_at: Date.now()`). Az archivált tervek elrejthetők a tábláról, de a szűrősávban lévő "Archiváltak" toggle segítségével bármikor visszakereshetők és visszaállíthatók.

### 4.8. Készletfoglalás (Stock Allocation) Működési Folyamata

A projektekhez való készletfoglalás tranzakció- és adatkonzisztencia-védett munkafolyamatot követ.

1. **API Szint (`PATCH /api/warehouse/stock/[price_list_item_id]`):**
   - Ellenőrzi a jogosultságot (`price_list` modul, `write` akció).
   - Ellenőrzi, hogy a kért lefoglalandó mennyiség (`quantity_allocated`) nem haladja-e meg a fizikai készletet (`quantity_in_stock`). Ha igen, a kérés hibával elutasításra kerül (`400 Bad Request`).
   - Atomi módon frissíti a `quantity_allocated` és a `notes` mezőket. A `notes` mező a korábbi megjegyzések megtartásával egy új sorban hozzáfűzi a foglalás adatait: `[FOGLALÁS: X db - Projekt: Y - Dátum: Z - Megjegyzés: W]`.
2. **Frontend UI és Számítások:**
   - A szabadon rendelkezésre álló készlet (Available Stock) kiszámítása dinamikusan történik: `quantity_in_stock - quantity_allocated`.
   - A Szállítólevél készítésekor vagy bevételezéskor a rendszer a szabad készletet veszi alapul, megelőzve az over-allocation és a túlfoglalás problémáját.

### 4.9. Leltározás (Inventory Taking) Működési Folyamata

A fizikai leltár eredményeinek rögzítése és a rendszerkészletek aszinkron korrekciója.

1. **Tárhely szerinti lekérdezés (`GET /api/warehouse/stock?location=[code]`):**
   - Betölti a megadott helyen tárolt összes `StockItem`-et, és a hozzájuk társított termékadatokat (`PriceListItem`).
2. **Leltári ív rögzítése (`POST /api/warehouse/inventory-taking`):**
   - A leltározás során a felhasználó minden tételnél rögzíti a tényleges fizikai mennyiséget (`physical_qty`) és az eltérés indoklását (`notes`).
   - A backend tranzakciós sessionben végrehajtja a korrekciókat:
     - Minden megváltozott tételnél frissíti a `StockItem.quantity_in_stock` értékét a tényleges fizikai mennyiségre.
     - Létrehoz egy `StockTransaction` bejegyzést `type: "adjustment"`, `reference_type: "inventory_taking"`, `reference_id: <audit_id>` adatokkal, rögzítve az eltérés mértékét (pozitív/negatív darabszám).
     - Hozzáadja a leltár adatait az audit loghoz (`InventoryAuditModel`), lezárt (`completed`) státusszal és a leltár lezárójának adataival.

---

_Minden uj adatbazis mezo, uj API parameter vagy UI gomb bevezetese eseten ezt a dokumentumot ertelemszeruen, ugyanilyen melysegben, logikailag vezetve kell boviteni!_
