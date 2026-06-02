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
 * Visszaadja a PDF generáláshoz szükséges összes adatot (kontakt, beállítások, jótállás)
 * A PDF renderelés a kliensen történik html2pdf.js-sel
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
        ? await ContactModel.findById(warranty.contact_id).lean()
        : null;

      return NextResponse.json(
        serializeForJson({
          warranty,
          contact,
          companyDetails: settings?.company_details ?? null,
          legalNotice: settings?.warranty_legal_notice ?? DEFAULT_LEGAL_NOTICE,
        }),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const DEFAULT_LEGAL_NOTICE = `Jótállási Tájékoztató és Jogi Feltételek

1. A jótállás alapján a fogyasztót megillető jogok

A fogyasztót a Polgári Törvénykönyv (Ptk.) és a 151/2003. (IX. 22.) Korm. rendelet alapján az alábbi jogosultságok illetik meg:

Kijavítás vagy kicserélés: A fogyasztó választása szerint kérhet kijavítást vagy kicserélést, kivéve, ha a választott jog teljesítése lehetetlen, vagy ha az a vállalkozásnak a másik igény teljesítésével összehasonlítva aránytalan többletköltséget eredményezne.

Árleszállítás vagy elállás: A fogyasztó igényelheti a vételár arányos leszállítását, vagy a szerződéstől elállhat (és a teljes vételárat visszakérheti), ha:
- A vállalkozás a kijavítást vagy a kicserélést nem vállalta, vagy annak nem tud eleget tenni a törvényi határidőn belül.
- Ismételt teljesítési hiba merült fel (a termék a kijavítás ellenére ismét meghibásodott).
- A teljesítés megtagadása miatt a fogyasztónak a kijavításhoz vagy kicseréléshez fűződő érdeke megszűnt.
- Jelentéktelen hiba miatt elállásnak nincs helye.

2. Kötelező határidők a javítás és csere során

Törekedni kell a 15 napra: A vállalkozásnak törekednie kell arra, hogy a kijavítást vagy kicserélést legfeljebb 15 napon belül elvégezze.

30 napos határidő: Ha a kijavítás vagy a kicserélés időtartama a 30 napot meghaladja, a vállalkozás köteles a terméket a 30 napos határidő lejártát követő 8 napon belül kicserélni. Ha a cserére nincs lehetőség, a vállalkozás köteles a vételárat a 30 napos határidő lejártát követő 8 napon belül a fogyasztónak visszatéríteni.

Gazdasági totálkár (3 javítás után): Ha a jótállási időszak alatt a termék a 3. javítást követően ismét meghibásodik – és a fogyasztó nem kér árleszállítást vagy elállást –, a vállalkozás köteles a terméket 8 napon belül kicserélni. Ha a cserére nincs lehetőség, a vételárat kell 8 napon belül visszafizetni.

3. A jótállási idő tartama és kezdete

A jótállási idő a termék fogyasztónak történő átadásával, vagy ha az üzembe helyezést a vállalkozás/annak megbízottja végzi, az üzembe helyezés napjával kezdődik.

Megjegyzés: A jótállási idő meghosszabbodik a kijavításra átadás napjától kezdve azzal az idővel, amely alatt a fogyasztó a terméket a hiba miatt rendeltetésszerűen nem használhatta. A termék kijavítása esetén a jótállás időtartama a javítással érintett részre (vagy a kicserélt termékre/fődarabra) újra kezdődik.

4. Hol és hogyan érvényesíthető a jótállási igény?

A fogyasztó a kijavítás iránti igényét közvetlenül a jótállási jegyen feltüntetett javítószolgálatnál (szerviznél) vagy a vállalkozás székhelyén/fióktelepén is bejelentheti.

A vállalkozás neve: SIROTECH Kft.
Székhelye: 8000 Székesfehérvár, Lövölde utca 24 4/15
E-mail címe: hello@sironic.hu
Kijelölt szerviz: A vállalkozás székhelye

5. Jogvita és békéltető testületek

Fogyasztói jogvita esetén a fogyasztó a lakóhelye vagy tartózkodási helye szerinti vármegyei (vagy fővárosi) kereskedelmi és iparkamarák mellett működő Békéltető Testülethez fordulhat ingyenes, gyors és peren kívüli jogvitarendezésért.

Az illetékes Békéltető Testületek elérhetőségei: www.bekeltetes.hu`;
