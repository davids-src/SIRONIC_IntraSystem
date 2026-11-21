---
title: Megrendelőlapok
description: Beszállítói megrendelések felvétele, küldése és teljesítése.
order: 4
section: Értékesítés
permissions:
  - ertekesites:megrendelo:read
---

## Hol találod

**Oldalsáv → Értékesítés → Megrendelőlapok** (`/ertekesites/megrendelok`)

## Mit látsz

Táblázat a megrendelőlapokról: azonosító (`MR-000042`), beszállító, állapot, bruttó összeg, várható szállítás. Az archivált lapok alapból rejtve vannak.

## Új megrendelőlap

Az **Új megrendelőlap** gombbal (**Megrendelőlapok kezelése**, `ertekesites:megrendelo:write`) válassz beszállítót (a partnerek közül), add meg a várható szállítást, majd vedd fel a tételeket: kereshetsz a termék árlistában, vagy kézi tételt adhatsz hozzá. A nettó, ÁFA és bruttó összeget a rendszer mentéskor újraszámolja.

## Állapotok

Piszkozat → Elküldve → Teljesítve; Törölt (külön jogosultság: **Megrendelőlap törlése**, `ertekesites:megrendelo:delete`). A tételek és a beszállító **csak Piszkozat állapotban** módosíthatók.

A **Teljesítve** jelölés csak elküldött megrendelőlapon végezhető el. Ha a készletmodul be van kötve, a teljesítés a tételeket bevételezi; a bevételezés eredménye (sikeres / sikertelen) az adatlapon látszik. Sikertelen bevételezésnél a teljesítés rögzítve marad, a bevételezés újra megkísérelhető.

## Archiválás

A megrendelőlap nem törölhető, csak archiválható az ok megadásával; az archivált lap visszaállítható.

## Kapcsolódó fejezetek

- [Szerződések és sablonok](/help/szerzodesek)
- [Ajánlatok — lista és állapotok](/help/ajanlatok)
- [Partner adatlapja](/help/partner-adatlap)

_Utolsó frissítés: 2026-11_
