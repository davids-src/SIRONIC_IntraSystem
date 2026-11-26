---
title: Ajánlatok — lista és állapotok
description: Árajánlatok listája, állapotváltások, kiküldés, utánkövetés, archiválás és PDF.
order: 1
section: Értékesítés
permissions:
  - ertekesites:ajanlat:read
---

## Hol találod

**Oldalsáv → Értékesítés → Ajánlatok** (`/ertekesites/ajanlatok`)

## Mit látsz

Táblázat az ajánlatokról: azonosító (`AJ-000042`), cím, partner, állapot, bruttó összeg, érvényesség és utánkövetés dátuma. A táblázat felett kereséssel, szűrőkkel és oszlopválasztóval finomíthatod a listát. Az archivált ajánlatok alapból rejtve vannak; az **Archiváltak mutatása** gombbal előhozhatók.

Az **Új ajánlat** gomb az **Ajánlatok kezelése** (`ertekesites:ajanlat:write`) jogosultsággal látszik.

## Állapotok

| Állapot    | Jelentése                               | Innen hova léphet       |
| ---------- | --------------------------------------- | ----------------------- |
| Piszkozat  | Készül, szerkeszthető                   | Kész, Elküldve          |
| Kész       | Átnézve, kiküldésre vár                 | Piszkozat, Elküldve     |
| Elküldve   | Az ügyfélnek kiment                     | Elfogadva, Elutasítva   |
| Elfogadva  | Az ügyfél elfogadta                     | —                       |
| Elutasítva | Az ügyfél elutasította (az ok kötelező) | Piszkozat (újraajánlás) |

A **Kiküldés** (Elküldve állapotba állítás) külön jogosultság: **Ajánlat kiküldése** (`ertekesites:ajanlat:kuld`). Üres ajánlat nem küldhető ki. Kiküldéskor a rendszer automatikusan beállít egy utánkövetési dátumot 3 munkanappal későbbre; ezt az adatlapon módosíthatod.

Az állapotváltások az adatlap **Állapot-előzmények** részében visszakereshetők (ki, mikor).

## Szerkesztés csak piszkozatban

Az ajánlat tartalma (cím, partner, tételek, kedvezmény) **csak Piszkozat állapotban** szerkeszthető. Kiküldés után a tartalom zárolt — ha módosítani kell, utasítsd el, majd állítsd vissza Piszkozatba, vagy készíts új ajánlatot.

## Árak és összegek

Az árlistából felvett tételek ára a felvétel pillanatában **befagyasztott** (az árlista későbbi változása nem érinti). A nettó, ÁFA és bruttó összegeket mindig a szerver számolja újra mentéskor. A **Fedezet** (belső költség és árrés) csak az **Ajánlatok kezelése** jogosultsággal látszik.

## PDF

Az adatlap **PDF / nyomtatás** gombja a nyomtatási ablakot nyitja, ahol a „Mentés PDF-be” opciót választhatod. A PDF kizárólag az ajánlatba mentett értékekből készül.

## Archiválás

Az ajánlat nem törölhető, csak **archiválható**, az **ok megadásával**. Az archivált ajánlat nem szerkeszthető; a **Visszaállítás** az **Ajánlat archiválás visszaállítása** (`ertekesites:ajanlat:delete`) jogosultságot kéri.

## Kapcsolódó fejezetek

- [Új ajánlat készítése](/help/ajanlat-varazslo)
- [Szerződések](/help/szerzodesek)
- [Termék árlista](/help/arlista-termekek)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
