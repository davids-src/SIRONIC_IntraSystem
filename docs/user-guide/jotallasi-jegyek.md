---
title: Jótállási jegyek
description: Jótállási jegy kiállítása, nyomtatása, állapotai és a jogi szöveg szerkesztése.
order: 4
section: Bizonylatok
permissions:
  - bizonylat:jotallas:read
---

## Hol találod

**Oldalsáv → Bizonylatok → Jótállási jegyek** (`/bizonylat/jotallasok`)

## Mit látsz

Táblázat a jegyekről (`JJY-000042`): partner, számlaszám, állapot, lejárat.

## Kiállítás

Az **Új jótállási jegy** gombbal (`bizonylat:jotallas:write`) válassz partnert, add meg a tételeket (termék, gyári szám, jótállási idő években, kezdet). A tételenkénti lejáratot és a jegy lejáratát a rendszer számolja. A kiállításkori jogi szöveg a jegybe rögzül.

## Állapotok

Aktív, Lejárt, Igényelt, Érvénytelen. A **Lejárt** állapot megjelenítéskor számolódik (az aktív jegy lejárat után lejártnak látszik). Az adatlapon a **PDF / nyomtatás** gombbal nyomtatható a jegy.

## Jogi szöveg

A **Jogi szöveg** gombbal (`/bizonylat/beallitasok`) a jegyekre nyomtatott szöveg szerkeszthető. A módosítás csak az új jegyekre érvényes, a már kiállítottak az eredeti szöveget őrzik.

## Archiválás

Okkal archiválható (`bizonylat:jotallas:delete`), visszaállítható.

## Kapcsolódó fejezetek

- [Számlák](/help/szamlak)

_Utolsó frissítés: 2026-11_
