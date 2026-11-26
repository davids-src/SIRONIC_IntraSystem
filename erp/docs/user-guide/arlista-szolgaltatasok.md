---
title: Szolgáltatás árlista
description: Kategóriák szerinti szolgáltatások, ármátrix, árbontás és partner-specifikus ár.
order: 2
section: Árlista
permissions:
  - arlista:szolgaltatas:read
---

## Hol találod

**Oldalsáv → Árlista → Szolgáltatás árlista** (`/arlista/szolgaltatasok`)

## Mit látsz

A lap tetején három mutató: **Összes tétel**, **Aktív tételek**, **Kategóriák**. Alattuk a szolgáltatások, kategóriák (és alkategóriák) szerint fába rendezve.

- **Fa nézet** — kategóriánként összecsukható csoportok. Egy sor elején a nyílra kattintva kinyílik az **árbontás kártya**: a belső alapár, az árazás típusa és az összes ügyfélkategória ára egyetlen helyen.
- **Mátrix nézet** — minden szolgáltatás egy sorban, minden ügyfélkategória külön oszlopban, Excel-szerűen.

## Partner ára

A **Partner árazási profilja** sávban megadhatod a partner szerepét, ügyfélkategóriáját, szerződés típusát és (alvállalkozónál) jelenlétét. A rendszer ebből kiválasztja a megfelelő szorzót, és egy extra oszlopban mutatja a partner árát. Sürgősség is választható (aznapi, munkaidőn kívüli, hétvége, éjszakai), ami tovább szorozza az árat.

Az árak a böngészőben számolódnak a beállított szorzókból, 100 Ft-ra kerekítve, ÁFA nélkül. Ha egy tétel ajánlatba vagy munkalapra kerül, a szerver az akkori árat **befagyasztja**: utólagos szorzó-változás nem módosítja a kiállított dokumentumot.

## Szolgáltatás felvétele és szerkesztése

**Szolgáltatás kezelése** (`arlista:szolgaltatas:write`) jogosultsággal az **Új szolgáltatás** gombbal vehetsz fel tételt. Az árazás típusa:

- **Fix ár** — megadott belső alapár.
- **Óradíj alapú** — az óradíj-kategória díja a rezsi szorzóval.
- **Egységalapú** — darabszám szerinti sávok.
- **Egyedi árajánlat** — nincs kalkulált ár.

A kód a kategória előtagjából és sorszámból áll (például `IT-0001`). A szolgáltatás archiválásához ok megadása kötelező.

## Kategóriák

A **Kategóriák** gombbal kezelheted a kategóriákat és alkategóriákat. Ha még nincs kategória, az **Alap kategóriák létrehozása** gomb 10 alapértelmezettet hoz létre. A kódelőtag létrehozás után nem módosítható.

## Kapcsolódó fejezetek

- [Termék árlista](/help/arlista-termekek)
- [Árképzési beállítások](/help/arlista-beallitasok)

_Utolsó frissítés: 2026-11_
