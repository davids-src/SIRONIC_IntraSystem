---
title: Eszköz adatlapja — kiadás, visszavétel, szerviz
description: Eszköz kiadása kollégának, visszavétele az állapot rögzítésével, szerviz, elveszett és kivonás; a mozgásnapló; törlés és archiválás.
order: 2
section: Eszközök
permissions:
  - eszkoz:eszkoz:read
---

## Hol találod

**Oldalsáv → Eszközök → Eszközök**, majd kattints egy eszközre (`/eszkoz/<azonosító>`).

## Mit látsz

Az adatlap tetején az eszköz neve, az **állapot** és a **fizikai állapot** jelzése, mellette a műveletgombok. Alatta az alapadatok és a **mozgásnapló**: minden kiadás, visszavétel, szerviz, elveszés és kivonás időrendben (legfrissebb elöl), ki végezte és kinek adva. A napló csak bővül, a bejegyzések nem módosíthatók.

## Műveletek

Az eszköz állapota csak ezekkel a gombokkal változik, és csak a megfelelő állapotból:

| Művelet              | Honnan                       | Hová       | Jogosultság           |
| -------------------- | ---------------------------- | ---------- | --------------------- |
| **Kiadás**           | raktáron                     | kiadva     | `eszkoz:eszkoz:kiad`  |
| **Visszavétel**      | kiadva                       | raktáron   | `eszkoz:eszkoz:kiad`  |
| **Szervizbe küldés** | raktáron, kiadva             | szervizben | `eszkoz:eszkoz:write` |
| **Szerviz lezárása** | szervizben                   | raktáron   | `eszkoz:eszkoz:write` |
| **Elveszett**        | raktáron, kiadva, szervizben | elveszett  | `eszkoz:eszkoz:write` |
| **Kivonás**          | bármelyik, kivéve kivont     | kivonva    | `eszkoz:eszkoz:write` |

- **Kiadáskor** válaszd ki a kollégát (és ha kell, írj megjegyzést): ő értesítést kap, az eszköz pedig megjelenik a **Feladatok** oldalán a felelősségei között.
- **Visszavételkor** kötelező megadni, milyen fizikai állapotban jött vissza az eszköz.
- Ha ketten egyszerre próbálják kiadni ugyanazt az eszközt, csak az első sikerül; a másik hibaüzenetet kap, és frissítenie kell az oldalt.
- A **kivont** eszközön már nem végezhető művelet, és nem is szerkeszthető, de a története megmarad.

## Szerkesztés és törlés

A **Szerkesztés** gombbal az alapadatok módosíthatók (állapot és birtokos nem). A **törlés** (`eszkoz:eszkoz:delete`) csak olyan eszközön lehetséges, amelynek még nincs mozgásnaplója, például téves felvételnél. Egyébként az eszközt ki kell vonni — ez az archiválás.

## Kapcsolódó fejezetek

- [Eszközök — lista és összesítő](/help/eszkoz-lista)
- [Feladatok — teendőim, saját és csoportos feladatok](/help/feladatok)

_Utolsó frissítés: 2026-11_
