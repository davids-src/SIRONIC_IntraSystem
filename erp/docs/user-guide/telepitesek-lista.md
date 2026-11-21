---
title: Telepítések és kiépítési lépések
description: Partneroldalak kiépítése lépésenként, dry-run, adoptálás, ellenőrzés, kihagyás és az eseménynapló.
order: 1
section: Telepítések
permissions:
  - deployments:telepites:read
---

## Hol találod

**Oldalsáv → Telepítések → Telepítések** (`/telepitesek`). Egy telepítés adatlapja: `/telepitesek/<azonosító>`.

## Mit látsz

A lista felett négy mutató: összes telepítés, élő, kiépítés alatti és a beavatkozást igénylő (hibás vagy kézi lépéssel). A táblázat sorára kattintva nyílik az adatlap.

## Új telepítés

Az **Új telepítés** gombbal (`deployments:telepites:write`) add meg a nevet és a domaint (egyedi). A DNS, a proxy, az image, a stack és a számlázás adatai később is kitölthetők. A hosting- és domain-nyilvántartás ugyanebben a modulban él: a lejáratokat a telepítés adatlapján rögzíted.

## Kiépítési lépések

Az adatlapon a lépések sorrendben jelennek meg: Cloudflare zóna, névszerver-delegálás, DNS-rekordok, SSL tanúsítvány, proxy host, image építés, stack létrehozás, stack indítás. Lépésenként (`deployments:telepites:futtat`):

- **Terv (dry-run)**: megmutatja, mit tenne a lépés, de semmit sem módosít.
- **Futtatás / Újra**: lefuttatja a lépést. Ha az erőforrás már létezik, a lépés csak ellenőrzi és "kész" lesz. A hibás lépés újrafuttatható.
- **Adoptálás**: egy már meglévő erőforrás azonosítóját rögzíted, a rendszer ellenőrzi és átveszi.
- **Ellenőrzés**: összeveti a tárolt állapotot a szolgáltatóval, és kiírja az eltéréseket.
- **Kihagyás** (`deployments:telepites:write`): a lépés nem szükséges; visszavonható.

A **Következő lépések futtatása** gomb sorban lefuttatja a soron következő lépéseket, és az első akadálynál megáll. Ha a lépés függősége nem teljesül, a futtatás elutasításra kerül; csak a **Telepítések törlése** jogosultságú felhasználó írhatja felül.

A lépések állapotai a Feladatok folyamat-nézetében is látszanak: függő = tervezett, fut vagy kézi = aktív, kész vagy adoptált = kész, hibás = elutasítva.

## Eseménynapló és életciklus

Az adatlap oldalán időrendi napló mutatja a futtatásokat és hibákat; a titkos adatok itt is kitakartak. Az életciklus panelen felfüggesztheted vagy archiválhatod (kötelező indokkal) a telepítést; csak el nem indított telepítés törölhető véglegesen.

## Kapcsolódó fejezetek

- [Csomagok és fizetések](/help/telepitesek-fizetesek)
- [Integrációk és stack sablonok](/help/telepitesek-integraciok)
- [Feladatok folyamata](/help/feladatok-folyamat)

_Utolsó frissítés: 2026-11_
