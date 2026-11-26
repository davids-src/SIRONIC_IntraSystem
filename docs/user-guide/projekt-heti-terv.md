---
title: Heti terv — a csapat heti feladatai
description: Kanban tábla heti bontásban, felelős szerinti szűréssel, gyors állapotváltással, delegálással és archiválással.
order: 4
section: Projektek
permissions:
  - projekt:hetiterv:read
---

## Hol találod

**Oldalsáv → Projektek → Heti terv** (`/projekt/heti-terv`)

## Mit látsz

Egy négy oszlopos tábla: **Teendő**, **Folyamatban**, **Kész**, **Blokkolt**. A kártyákon a cím, a felelős, a prioritás (alacsony, közepes, magas, sürgős — a sürgős van legfelül), a határidő és a kapcsolt projekt, hibajegy vagy munkalap látszik. A fejléc nyilaival hetet váltasz, az **Ez a hét** gombbal visszaugrasz a jelenlegire. A **felelős szűrővel** egy kolléga tervére szűkítheted a nézetet, az **Archiváltak mutatása** gombbal az archivált kártyák is előkerülnek.

## Ki mit módosíthat

Bárki, aki látja a lapot, minden munkatárs tervét **megtekintheti** (koordináció). Új tervet és módosítást **csak a saját nevedre** vehetsz fel (`projekt:hetiterv:write`). Ha van **delegálási** jogosultságod (`projekt:hetiterv:delegal`), bárki számára felvehetsz és bárkiét módosíthatod; a megkapott kolléga értesítést kap. A szabályt a rendszer ellenőrzi, nem csak a gombokat rejti el.

## Gyors állapotváltás és archiválás

A kártyán lévő legördülőből azonnal váltasz állapotot. Archiváláskor az **ok megadása kötelező**; az archivált kártya visszaállítható. A rád váró, még nem kész tervek a [Feladatok](/help/feladatok) lapon, a Teendőim között is megjelennek.

## Kapcsolódó fejezetek

- [Feladatok — teendőim](/help/feladatok)
- [Projekt adatlapja](/help/projekt-adatlap)

_Utolsó frissítés: 2026-11_
