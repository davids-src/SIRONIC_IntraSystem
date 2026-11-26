---
title: Csoportos feladatok kezelése
description: Több embernek kiadott feladat egy egységként — haladás, elsődleges felelős, résztvevők állapota, közös beszélgetés, és a közös műveletek — határidő, prioritás és kategória, címzett hozzáadása és visszavonása.
order: 5.5
section: Áttekintés
---

## Hol találod

**Oldalsáv → Általános → Feladatok** (`/feladatok`):

- kiadóként az **Általam kiadott** fülön (a fül mellett a nyitott feladataid száma — egy csoportos feladat egynek számít);
- címzettként a **Teendőim** között, a saját példányodnál;
- bármelyik résztvevő példányának **adatlapján** (`/feladatok/<azonosító>`).

Csoportos feladat akkor jön létre, ha az **Új feladat** ablakban több embert jelölsz ki (lásd [Feladatok](/help/feladatok)), vagy ha egy meglévő feladathoz **címzettet adsz hozzá**. Mindenki saját példányt kap, azt maga fogadja el, maga dolgozik rajta és maga zárja le. Te, a kiadó, egy egységként látod és kezeled az egészet.

## Mit látsz az Általam kiadott listában

A lista táblázat, amelyben egy csoportos feladat **egyetlen sor**:

- **Feladat** — a cím, alatta halványan a haladás („3/5 kész”) és a résztvevők neve.
- **Állapot** — a csoport összesített állapota (ha valaki elutasította, az áll elöl, mert neked kell döntened).
- **Határidő** — a legkorábbi nyitott határidő; a lejárt pirossal.
- **Prioritás**, **Felelős** — a felelős oszlopban minden résztvevő neve.

Az alapsorrend: elöl a lejártak, utánuk a sürgősek, aztán határidő szerint. A **Szűrők** gombbal szűrhetsz állapot, prioritás, határidő, esedékesség, felelős és kiadó szerint; az **Oszlopok** gombbal további oszlopokat kapcsolhatsz be. A felelős szerinti keresés és szűrés a csoport bármelyik tagjára talál. Ugyanez a táblázat látszik a **Lezártak** és — jogosultsággal — a **Mindenki feladatai** fülön is.

## A csoport kezelése egy helyen

A sorra bárhol kattintva megnyílik a feladat oldala. Kiadóként itt:

- **Résztvevők** — haladássáv (az egeret fölé állítva állapotonként a darabszám), alatta mindenki egy sorban: állapot, **Lejárt** jelzés, a lépései („2/5 lépés · most: Kalkuláció”), az utolsó üzenete, továbbadásnál hivatkozás a továbbadott példányra, és ha a határideje eltér a csoportétól, az is.
- Egy **névre kattintva** az illető példánya nyílik meg: a **Mi a teendő?** panel („… példánya”) az övé — elutasítás után innen kiadhatod másnak.
- **Beszélgetés** — a csoportnak **egy közös** beszélgetése van: amit bárki ír, azt mindenki látja, aki a feladaton dolgozik (te és minden résztvevő), bármelyik példányt nyitja meg. Ha egyvalakihez szólsz, jelöld meg **@**-tal — ő külön értesítést kap. Részletek: [Feladat adatlapja — Beszélgetés](/help/feladatok-adatlap).

### Közös műveletek (csak a kiadónak)

- **Határidő, prioritás, kategória** — az új érték minden még nyitott példányra érvényes; a kész példányok változatlanok maradnak. Mindenki „Módosult a feladat” értesítést kap, a naplóban „Módosítva: …” sor jelzi a változást. A kategóriát másikra cserélheted, de nem törölheted. Egyéni feladatnál ugyanez a gomb a feladatot módosítja.
- **Szöveg javítása** — a fejléc gombjával a címet és a leírást minden példányon egyszerre javítod (lásd [Feladat adatlapja](/help/feladatok-adatlap)).
- **Üzenet mindenkinek** — külön gomb már nincs: írj a közös **Beszélgetésbe**, azt mindenki látja, és mindenki értesítést kap.
- **Címzett hozzáadása** — új embereket adhatsz a csoporthoz (név szerint vagy egész szerepkört). Ők ugyanazzal a leírással, határidővel, prioritással és csatolmányokkal kapják meg a saját példányukat, elfogadásra várva. Aki már benne van (nyitott vagy kész példánnyal), azt a rendszer kihagyja. Egyéni feladathoz is adhatsz címzettet: ekkor csoportos lesz, és az eddigi felelős lesz az elsődleges felelős. Más modulhoz kapcsolt feladathoz nem adható címzett.
- **Elsődleges legyen** — egy résztvevő sorában: ő lesz az elsődleges felelős, a korábbi közreműködő lesz. Az érintett nyitott példányok naplójában ez is látszik, az új elsődleges felelős értesítést kap.
- **Visszavonom tőle** — egy résztvevő sorában: csak nála kerül le a feladat (megerősítés után, opcionális indokkal); a többiek folytatják.
- **Visszavonás mindenkitől** — megerősítés után minden még nyitott példányt visszavon; a kész példányok megmaradnak.

## Ha te kaptad a csoportos feladatot

A Teendőim sorában a cím alatt „csoportos, N fő” áll. Megnyitva a **Résztvevők** dobozban látod, ki az **elsődleges felelős**, ki hol tart, a lépéseiket és az utolsó üzenetüket — csak olvasásra. A **Mi a teendő?** panelen a saját példányodat fogadod el és zárod le. A **Beszélgetés** közös: amit írsz, azt a kiadó és a többi résztvevő is látja, és te is látod az övékét. A közös beszélgetés előtti üzeneteid továbbra is csak neked és a kiadónak látszanak.

## Kimutatás

A Kimutatásban a **Kiadott feladat** csempe egy csoportos feladatot **egyszer** számol (alatta: ebből hány csoportos, hány teljesen kész, és összesen hány példány). Minden más szám és a munkatársak táblázata **példányonként** számol: egy csoportos feladat minden résztvevőnél egy-egy feladat. A Kiadók összesítésben a feladatszám mellett zárójelben a példányszám látszik.

## Kapcsolódó fejezetek

- [Feladatok — teendőim, saját és csoportos feladatok](/help/feladatok)
- [Feladat adatlapja](/help/feladatok-adatlap)
- [Listák és táblázatok használata](/help/tablazatok)
- [Jelzések — értesítésközpont](/help/jelzesek)

_Utolsó frissítés: 2026-11_
