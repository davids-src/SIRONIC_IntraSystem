import { NextResponse } from "next/server";
import {
  WarrantyCardModel,
  ContactModel,
  SettingsModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

/**
 * GET /api/warranties/:id/pdf-data
 * Visszaadja a PDF generáláshoz szükséges összes adatot (kontakt, beállítások, jótállás).
 * A jogi szöveg automatikusan a partner típusától függ:
 *   - "individual" → A) Magánszemélyekre vonatkozó kötelező jótállás
 *   - "company" / "one_time" / egyéb → B) Vállalkozásokra vonatkozó önkéntes garancia
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "warranty", action: "view", scope: "global" });
    const { id } = await params;

    return await withDb(async () => {
      const [warranty, settings] = await Promise.all([
        WarrantyCardModel.findOne({
          _id: id,
          tenantId: actor.tenantId,
        }).lean() as Promise<any>,
        SettingsModel.findOne({ tenantId: actor.tenantId }).lean() as Promise<any>,
      ]);

      if (!warranty) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }

      const contact = warranty.contact_id
        ? ((await ContactModel.findById(warranty.contact_id).lean()) as any)
        : null;

      // Partner típusa alapján választjuk ki a jogi szöveget
      const isIndividual = contact?.type === "individual";
      const legalNotice = isIndividual
        ? LEGAL_NOTICE_A_INDIVIDUAL
        : LEGAL_NOTICE_B_COMPANY;

      return NextResponse.json(
        serializeForJson({
          warranty,
          contact,
          companyDetails: settings?.company_details ?? null,
          legalNotice,
          legalNoticeType: isIndividual ? "A" : "B",
        }),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}

// ─── A) Magánszemélynek történő értékesítésre – kötelező jótállás ──────────────

const LEGAL_NOTICE_A_INDIVIDUAL = `Jótállási Tájékoztató – A) Magánszemélynek történő értékesítés

1. A jótállás jogszabályi alapja
A jelen jótállás a Polgári Törvénykönyvről szóló 2013. évi V. törvény, az egyes tartós fogyasztási cikkekre vonatkozó kötelező jótállásról szóló 151/2003. (IX. 22.) Korm. rendelet, valamint a fogyasztó és vállalkozás közötti szerződés keretében eladott dolgokra vonatkozó szavatossági és jótállási igények intézésének eljárási szabályairól szóló 19/2014. (IV. 29.) NGM rendelet alapján illeti meg a Vevőt.

2. A jótállás időtartama
A jótállás időtartama a fogyasztási cikk bruttó eladási árától függ:
- Bruttó vételár 10.000 Ft – 250.000 Ft között: kötelező jótállás időtartama 24 hónap
- Bruttó vételár 250.000 Ft felett: kötelező jótállás időtartama 36 hónap
- Bruttó vételár 50.000 Ft alatt: a jótállás fennáll, jótállási jegy kiállítása helyett a számla/nyugta igazolja a jogosultságot.

3. A jótállás kezdő időpontja
A jótállási idő a fogyasztási cikk Vevő részére történő tényleges átadásának, illetve — telepítéssel/üzembe helyezéssel járó szolgáltatás esetén — a sikeres műszaki átadás-átvétel napjával kezdődik. Ezt a dátumot a jótállási jegyen, ennek hiányában az átadás-átvételi jegyzőkönyvben vagy a számlán/nyugtán kell rögzíteni.

4. A jótállás tartalma – a Vevőt megillető igények
Jótállási igényével a Vevő választása szerint:
- javítást vagy kicserélést kérhet, kivéve, ha a választott igény teljesítése lehetetlen, vagy ha a Vállalkozás számára a másik igény teljesítéséhez képest aránytalan többletköltséggel járna;
- ha a Vállalkozás a javítást vagy kicserélést nem vállalta, e kötelezettségének megfelelő határidőn belül, a Vevő érdekeit kímélve nem tud eleget tenni, vagy ha a Vevőnek a kijavításhoz vagy kicseréléshez fűződő érdeke megszűnt, a Vevő — választása szerint — a vételár arányos leszállítását igényelheti, a hibát a Vállalkozás költségére maga kijavíttathatja, vagy a szerződéstől elállhat.

A kijavítást vagy kicserélést — a fogyasztási cikk tulajdonságaira és a Vevő által elvárható rendeltetésére figyelemmel — megfelelő határidőn belül, a Vevő érdekeit kímélve kell elvégezni.

5. A jótállás nem terjed ki
A jótállás nem vonatkozik az alábbi okokból bekövetkezett meghibásodásra:
- nem rendeltetésszerű használat, a kezelési útmutatóban foglaltak be nem tartása;
- szakszerűtlen üzembe helyezés vagy szerelés, ha azt nem a Vállalkozás vagy az általa megbízott szakember végezte;
- a Vevő vagy arra jogosulatlan harmadik személy által végzett beavatkozás, javítási kísérlet;
- külső ok (pl. túlfeszültség, tápellátási hiba, elemi kár, rongálás, baleset) által okozott sérülés;
- rendeltetésszerű elhasználódás, kopó alkatrészek (pl. akkumulátor, tápegység élettartam-vége).

6. A jótállási igény érvényesítésének helye és módja
A Vevő a jótállási igényét a hello@sironic.hu e-mail-címen, a +36702735532 telefonszámon, vagy postai úton a 8000 Székesfehérvár, Lövölde utca 24. 4/15 szám alatti székhelyre eljuttatva jelentheti be. A Vállalkozás a bejelentést jegyzőkönyvben rögzíti, és a jegyzőkönyv másolatát a Vevő rendelkezésére bocsátja.
A jótállásból eredő jogok a jótállási jeggyel, ennek hiányában a fogyasztási cikk ellenértékének megfizetését igazoló bizonylattal (számla, nyugta) érvényesíthetők.

7. Ügyintézési határidők
A Vállalkozás törekszik arra, hogy a kijavítást vagy kicserélést legfeljebb tizenöt napon belül elvégezze. Ha a javítás vagy csere időtartama a tizenöt napot meghaladja, a Vállalkozás a Vevőt tájékoztatja a javítás vagy csere várható időtartamáról.

8. A jótállás és az egyéb fogyasztói jogok viszonya
A jótállás nem érinti a Vevőt jogszabály alapján megillető kellékszavatossági és — ahol alkalmazandó — termékszavatossági jogainak fennállását és érvényesíthetőségét; a Vevő e jogokat a jótállási igénytől függetlenül, azzal párhuzamosan is gyakorolhatja.`;

// ─── B) Vállalkozásnak (cégnek) történő értékesítésre – önkéntes garancia ───────

const LEGAL_NOTICE_B_COMPANY = `Garanciális Tájékoztató – B) Vállalkozásnak (cégnek) történő értékesítés

1. A garancia jogi jellege
A jelen garancia nem a fogyasztóvédelmi jogszabályok szerinti kötelező jótállás, hanem a Polgári Törvénykönyvről szóló 2013. évi V. törvény diszpozitív szabályai alapján, a Felek szerződéses megállapodásával létrejövő önkéntes jótállás (garancia). Tartalmát, terjedelmét és időtartamát a Felek a jelen tájékoztatóban, illetve az egyedi szerződésben/megrendelésben szabadon állapítják meg.

2. A garancia időtartama
A garancia időtartama eszközkatégóriánként eltérő lehet, az egyedi ajánlatban/szerződésben, illetve a jótállási jegyen feltüntetettek szerint. Alapértelmezett kategóriák:
- Aktív elektronikai eszközök (kamera, rögzítő, riasztóközpont, jelzésadó): 24 hónap
- Passzív/kiegészítő eszközök (kábelezés, tápegység, tartókonzol): 12 hónap
- Telepítési/kivitelezési munkadíj: 12 hónap

3. A garancia kezdő időpontja
A garancia a sikeres műszaki átadás-átvétel — ennek hiányában a számla szerinti teljesítés — napjával kezdődik, amit a Felek átadás-átvételi jegyzőkönyvben rögzítenek.

4. A garancia terjedelme
A Vállalkozás vállalja, hogy a garanciaidő alatt jelentkező, rendeltetésszerű használat mellett fellépő gyártási vagy anyaghibából eredő meghibásodást — választása szerint — kijavítja vagy kicseréli. A Vállalkozás a kijavítást/cserét ésszerű, a Felek által előzetesen egyeztetett határidőn belül végzi el.

5. A garancia nem terjed ki
- nem rendeltetésszerű, üzemeltetési útmutatótól eltérő használatra, illetve a Megrendelő vagy harmadik személy általi beavatkozásra;
- a Megrendelő által biztosított kiegészítő infrastruktúra (hálózat, tápellátás, épületgépészet) hibájára visszavezethető meghibásodásra;
- vis maior, elemi kár, rongálás, illetéktelen hozzáférés okozta károsodásra;
- kopó alkatrészekre és a rendeltetésszerű elhasználódásra;
- a Megrendelő késedelmes karbantartási/üzemeltetési kötelezettség-teljesítésére visszavezethető hibára, ha erről a Felek a szerződésben megállapodtak.

6. Felelősségkorlátozás
A Felek — a Ptk. vonatkozó szabályaival összhangban — megállapodnak, hogy a Vállalkozás a jelen garancia alapján kizárólag a meghibásodott eszköz kijavításáért vagy cseréjéért felel; a Vállalkozás felelőssége nem terjed ki a Megrendelőnél vagy harmadik személynél felmerülő közvetett károkra, elmaradt haszonra, üzemkiesésből eredő kárra, kivéve, ha a kárt a Vállalkozás szándékos vagy súlyosan gondatlan magatartása okozta.

7. Az igény érvényesítésének menete
A Megrendelő a garanciális igényét írásban, a hello@sironic.hu e-mail-címen vagy a +36702735532 telefonszámon jelenti be, a hiba leírásával és az érintett eszköz azonosító adataival (szerződés-/tételszám, gyártási szám). A Vállalkozás a bejelentést nyilvántartásba veszi és a Feleknek a szerződésben rögzített határidőn belül visszajelez.

8. Irányadó jog és vitarendezés
A jelen garanciára és az abból eredő jogvitákra a magyar jog, elsődlegesen a Polgári Törvénykönyv rendelkezései az irányadók. A Felek a jelen garanciával kapcsolatos vitás kérdéseket elsődlegesen egyeztetés útján rendezik.`;
