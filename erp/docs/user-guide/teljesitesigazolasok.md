---
title: Teljesítésigazolások
description: Igazolás összeállítása, küldése az ügyfélnek, online aláírás és elutasítás.
order: 2
section: Bizonylatok
permissions:
  - bizonylat:igazolas:read
---

## Hol találod

**Oldalsáv → Bizonylatok → Teljesítésigazolások** (`/bizonylat/igazolasok`)

## Mit látsz

A lista tetején négy csempe: az aláírt és az aláírásra váró érték (nettó/bruttó, darabszámmal), az elutasított és a piszkozat igazolások száma. Alatta a táblázat (`TI-000042`).

## Új igazolás

Az **Új igazolás** gombbal (`bizonylat:igazolas:write`) vehetsz fel igazolást. A **Betöltés forrásból** résznél elfogadott ajánlatot vagy projektet választhatsz: a partner, a cím és a tételek átkerülnek az űrlapra, ahol még módosíthatók. Az árak az ajánlatból rögzítve érkeznek. A belső megjegyzést és a beszerzési árakat az ügyfél soha nem látja. Az összegeket a rendszer mentéskor újraszámolja. Az igazolás csak **Piszkozat** állapotban szerkeszthető.

## Küldés és aláírás

A **Küldés az ügyfélnek** gomb (`bizonylat:igazolas:kuld`) egyszer használható, lejáratú aláíró hivatkozást készít és e-mailben kiküldi a címzettnek. Újraküldéskor új hivatkozás készül, a régi érvénytelen. Az ügyfél megadja a nevét, beosztását és aláírását, vagy indoklással elutasítja. Az **Elfogadva** és az **Elutasítva** állapot végleges. Az aláírás időpontját a szerver rögzíti.

Elfogadott igazolásból a **Számla piszkozat készítése** gombbal számla-piszkozat indítható.

## Kapcsolódó fejezetek

- [Számlák](/help/szamlak)
- [Ajánlatok](/help/ajanlatok)

_Utolsó frissítés: 2026-11_
