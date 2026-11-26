---
title: Karbantartási tervek
description: Visszatérő karbantartások, esedékesség, hibajegy generálása.
order: 3
section: Szerviz
permissions:
  - szerviz:karbantartas:read
---

## Hol találod

**Oldalsáv → Szerviz → Karbantartás** (`/szerviz/karbantartas`); az áttekintő (`/szerviz`) a lejárt és hamarosan esedékes terveket is listázza.

## Hogyan működik

A terv egy partnerhez tartozó, hónapokban megadott gyakoriságú karbantartás az első esedékességgel. A következő esedékesség **megnyitáskor számolódik** (nincs háttérfolyamat): lejárt, hamarosan esedékes (az előrejelzési napokon belül) vagy rendben. A felelős Teendőim listájára az esedékes terv felkerül.

## Hibajegy generálása

A **Hibajegy generálása** gomb (`szerviz:karbantartas:write`) a soron következő ciklushoz hibajegyet hoz létre a terv sablonjából, majd a terv a következő ciklusra lép. Egy ciklushoz csak egy hibajegy készül, dupla kattintásra sem több.

## Archiválás

Okkal archiválható; a visszaállítás önálló jogosultság (`szerviz:karbantartas:delete`).

## Kapcsolódó fejezetek

- [Hibajegyek](/help/szerviz-hibajegyek)
- [Munkalapok](/help/szerviz-munkalapok)

_Utolsó frissítés: 2026-11_
