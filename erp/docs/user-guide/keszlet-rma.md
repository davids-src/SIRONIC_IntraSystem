---
title: RMA ügyek
description: Hibás vagy visszaküldött termékek ügyintézése — felvétel, állapotváltás, felelős kijelölése, előzmények.
order: 5
section: Készlet
permissions:
  - keszlet:rma:read
---

## Hol találod

**Oldalsáv → Készlet → RMA ügyek** (`/keszlet/rma`), ügyadatlap: `/keszlet/rma/<azonosító>`

## Lista

Sorszám (`RMA-2026-000001`), termék, gyári szám, partner és állapot. Az állapot szerint szűrhetsz.

## Új ügy

Az **Új RMA ügy** gombbal (`keszlet:rma:write`) válaszd ki a terméket az árlistából és az ügyfelet a partnerek közül, add meg a darabszámot, gyári számot, beszállítót.

## Állapotok

**Beérkezett** → **Beszállítónak elküldve** → **Kicserélve** / **Javítva** / **Selejtezve** → **Visszaadva az ügyfélnek**. Az adatlapon csak az éppen megengedett következő állapotok gombjai látszanak; a selejtezett és a visszaadott ügy lezárt. Két kolléga egyszerre nem léptetheti ugyanazt az ügyet: aki másodikként próbálkozik, frissítési üzenetet kap.

## Felelős

A **Felelős kijelölése** gombbal kollégát bízhatsz meg: ő értesítést kap, és az ügy megjelenik a **Feladatok** (Teendőim) listájában, amíg az ügy aktív.

## Kapcsolódó fejezetek

- [Készlet — műszerfal](/help/keszlet-muszerfal)
- [Feladatok — teendőim, saját és csoportos feladatok](/help/feladatok)

_Utolsó frissítés: 2026-11_
