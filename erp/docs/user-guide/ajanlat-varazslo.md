---
title: Új ajánlat készítése
description: Az ajánlat-varázsló lépései — fejléc, partner, tételek árlistából vagy kézzel, kedvezmény.
order: 2
section: Értékesítés
permissions:
  - ertekesites:ajanlat:write
---

## Hol találod

**Oldalsáv → Értékesítés → Ajánlatok → Új ajánlat** (`/ertekesites/ajanlatok/new`). Piszkozat ajánlat adatlapján a **Szerkesztés** gomb ugyanezt a felületet nyitja (`/ertekesites/ajanlatok/<azonosító>/edit`).

## Lépések

1. **Fejléc és partner** — add meg az ajánlat címét, válaszd ki a partnert, a pénznemet, az érvényességet. A partner nevét és címét a rendszer az ajánlatba másolja, ezért a partner későbbi átnevezése a kiadott ajánlatot nem változtatja.
2. **Tételek** — két mód van:
   - **Árlistából**: kezdj gépelni a keresőbe (kód vagy név), és kattints a találatra. A tétel ára a **partner árazási profilja** szerint számolódik, és a sorba **befagyasztva** kerül (a sor alatt látod a kódot és a dátumot). Ezt a nettó egységárat nem kell (és nem lehet) átírni; az egyedi árajánlatos szolgáltatásnál viszont kézzel adhatod meg az árat.
   - **Kézi tétel**: üres sor, megnevezés, mennyiség, egység, nettó egységár és ÁFA kitöltésével.
     Minden sorhoz megadhatsz soronkénti kedvezményt (%). Ha az árlistás tételek után partnert váltasz, a rendszer újraszámolja az árakat az új partner profilja szerint.
3. **Kedvezmény és végösszeg** — a globális kedvezmény az összes tételre vonatkozik. Az előnézet tájékoztató: mentéskor a szerver újraszámolja a nettó, ÁFA és bruttó összegeket.

A mentés Piszkozat állapotú ajánlatot hoz létre.

## Kapcsolódó fejezetek

- [Ajánlatok — lista és állapotok](/help/ajanlatok)
- [Termék árlista](/help/arlista-termekek)
- [Szolgáltatás árlista](/help/arlista-szolgaltatasok)
- [Partner adatlapja](/help/partner-adatlap)

_Utolsó frissítés: 2026-11_
