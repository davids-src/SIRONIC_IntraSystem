---
title: Médiatár
description: Központi kép- és fájltár feltöltéshez, kereséshez és linkeléshez.
order: 4
section: Adminisztráció
permissions:
  - media:read
---

## Hol találod

**Oldalsáv → Adminisztráció → Médiatár** (`/admin/media`)

## Mit tehetsz itt

- **Keresés** — fájlnév vagy leírás alapján.
- **Feltöltés** — kép vagy PDF feltöltése (`media:upload` jogosultság szükséges). A rendszer hash alapján felismeri, ha ugyanazt a fájlt korábban már feltöltötték, és nem tárolja el duplán.
- **Külső link hozzáadása** — kép hivatkozása URL alapján, feltöltés nélkül.
- **Törlés** — már nem használt elemek eltávolítása (`media:delete` jogosultság szükséges).

## Hol használható fel

A médiatárban tárolt elemek bármely olyan űrlapon kiválaszthatók, ahol képválasztó modal jelenik meg (pl. arculati logó és favicon beállításánál).

## Védett fájlok

A feladatokhoz csatolt képek és PDF-ek **védett** fájlok: nem jelennek meg a Médiatárban, itt nem kereshetők és nem törölhetők. Csak az nyithatja meg őket, aki a hozzájuk tartozó feladatot is láthatja (lásd [Feladat adatlapja](/help/feladatok-adatlap)).

## Kapcsolódó fejezetek

- [Arculat testreszabása](/help/admin-arculat)
- [Feladat adatlapja](/help/feladatok-adatlap)

_Utolsó frissítés: 2026-11_
