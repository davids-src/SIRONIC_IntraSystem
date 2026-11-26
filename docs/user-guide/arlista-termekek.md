---
title: Termék árlista
description: Termékek, munkadíjak és csomagok nettó árral, kódgenerálással és archiválással.
order: 1
section: Árlista
permissions:
  - arlista:termek:read
---

## Hol találod

**Oldalsáv → Árlista → Termék árlista** (`/arlista/termekek`)

## Mit látsz

Táblázat az árlista tételeiről: kód, név, típus (termék, szolgáltatás, munkadíj, csomag), kategória, nettó ár. A táblázat felett kereséssel, szűrőkkel és oszlopválasztóval finomíthatod a listát. Az archivált tételek alapból nem látszanak; az **Archivált** szűrővel előhozhatók.

Ha van **Termék árlista kezelése** (`arlista:termek:write`) jogosultságod, az **Új tétel felvétele** gombbal vehetsz fel tételt.

## Új tétel felvétele

1. Válaszd ki a **típust**. A rendszer a kódot automatikusan adja, a típus előtagjával (például termék: `HW-0001`, munkadíj: `MD-0001`).
2. Ha egyedi előtagot szeretnél, add meg a **Kódelőtag** mezőben (1–6 nagybetű vagy szám).
3. Töltsd ki a nevet, kategóriát, egységet, nettó árat, pénznemet és ÁFA-kulcsot.

A kód a mentés után nem módosítható.

## Archiválás

Az adatlapon az **Archiválás** gombbal kivezethetsz egy tételt. Az **ok megadása kötelező**. Az archivált tétel nem szerkeszthető és nem árazható dokumentumba, de a **Visszaállítás** gombbal újra aktívvá tehető. A tétel kódja foglalt marad.

## Beszerzési adatok (titkos)

A beszerzési adatok (beszállító, beszerzési ár) csak **Beszerzési adatok megtekintése** (`arlista:beszerzes:read`) jogosultsággal láthatók, és csak **Beszerzési adatok kezelése** (`arlista:beszerzes:write`) jogosultsággal módosíthatók. E nélkül a rendszer ezeket az adatokat el sem küldi a böngészőnek. A legutóbbi beszerzés ára és beszállítója a rekordokból automatikusan számolódik.

## Kapcsolódó fejezetek

- [Szolgáltatás árlista](/help/arlista-szolgaltatasok)
- [Árképzési beállítások](/help/arlista-beallitasok)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
