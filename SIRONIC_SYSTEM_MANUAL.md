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

- **Modul:** pl. `worklog`, `ticket`, `secret`
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
- **UI/UX:** A Raktár nézet bal oldalán a Raktárhelyek (fa-struktúra szerű mappa-nézet) listája, jobb oldalon a szűrt Készlet (StockItems) táblázata látható. A bevételezés egy több-lépéses (Wizard) modál ablakban történik.

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

Egy vagy több Hibajegy és Munkalap pénzügyi lezárása.

1. CRM API összekapcsolja a rekordokat: Egy `CompletionCertificate` dokumentumba felveszi a `worklog_ids` és `ticket_ids` tömböket.
2. E-mail integráció (`packages/emails`): Az állapot `sent`-re váltásakor egy renderelt React-email sablon kimegy az ügyfélnek, benne egy Magic Linkkel, ami a Partner Portál megfelelő azonosítójú igazolásához viszi.
3. **Portál UI:** Az ügyfél a Portálon egy letisztult, csak-olvasható összefoglaló asztalt (Table) lát a teljesített tételekről. Belső, CRM specifikus adatok (beszerzési árak, technikai belső kommentek) le vannak szűrve az API oldalon!
4. **Aláírási folyamat:** Ha rákattint az "Elfogadás és Aláírás" gombra, egy Dialog ablak nyílik a Signature Paddal. Aláírja, rányom a "Véglegesítés" gombra. Az aláírás Base64 adatként utazik (`PATCH /api/certificates/:id`). A payload méretét a Zod limitálja a túlcsordulás (Payload Too Large) támadások ellen. A rendszer elmenti az IP címet, időbélyeget, és az állapot `accepted`-re vált. A kártya a CRM-ben azonnal zöld pipát kap (Real-time érzet a `SWR` vagy `React Query` refetch mechanizmusa miatt).

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

---

_Minden uj adatbazis mezo, uj API parameter vagy UI gomb bevezetese eseten ezt a dokumentumot ertelemszeruen, ugyanilyen melysegben, logikailag vezetve kell boviteni!_
