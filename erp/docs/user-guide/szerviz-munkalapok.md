---
title: Munkalapok
description: Munkalap felvétele, tételek, aláírás, lezárás készletkiadással, PDF.
order: 2
section: Szerviz
permissions:
  - szerviz:munkalap:read
---

## Hol találod

**Oldalsáv → Szerviz → Munkalapok** (`/szerviz/munkalapok`)

## Munkalap felvétele

Az **Új munkalap** gombbal (`szerviz:munkalap:write`) add meg a partnert, a dátumot, a szerelőt és az elvégzett munkát. A tételeket soronként veheted fel: munkaóra vagy anyag; az árlistából keresve a rendszer a felvételkor **befagyasztja az árat** — későbbi árlistamódosítás nem érinti a munkalapot. A „Készletből” jelölő az anyagot lezáráskor kiadja a készletből.

Az **aláírás** (szerelő, ügyfél) rajzolható a felugró ablakban; csak kis méretű PNG/JPEG/WebP kép tárolható.

## Lezárás

A **Munkalap lezárása** (`szerviz:munkalap:lezar`) előbb ellenőrzi a készletet: ha egy anyagból nincs elég, a lezárás nem engedett. Lezárás után a tartalom nem szerkeszthető. Ha a készletkiadás technikai okból elakad, a munkalap lezárt marad, de piros jelzést kap, és a **Készletkiadás újrapróbálása** gomb pótolja — duplán nem ad ki. A készletet érintő lezárt munkalap nem archiválható.

## PDF

A **PDF / nyomtatás** gomb a munkalap beágyazott adataiból készít nyomtatható oldalt.

## Archiválás

Archiválás: `szerviz:munkalap:write` (ok kötelező); visszaállítás: `szerviz:munkalap:delete`.

## Kapcsolódó fejezetek

- [Hibajegyek](/help/szerviz-hibajegyek)
- [Karbantartási tervek](/help/szerviz-karbantartas)

_Utolsó frissítés: 2026-11_
