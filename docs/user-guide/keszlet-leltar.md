---
title: Leltár
description: Raktárhelyenkénti leltározás — számolt és várt mennyiség, kötelező indoklás eltérésnél, korrekciós mozgások a lezáráskor.
order: 4
section: Készlet
permissions:
  - keszlet:keszlet:read
---

## Hol találod

**Oldalsáv → Készlet → Leltár** (`/keszlet/leltar`)

## Leltár indítása

A **Leltár indítása** gombbal (`keszlet:leltar:write`) válassz raktárhelyet: a rendszer lementi minden ottani tétel **várt mennyiségét**. Egy raktárhelyen egyszerre egy nyitott leltár lehet.

## Számolás

A leltárlapon tételenként add meg a **számolt** mennyiséget és **Mentés**. Ha eltér a várttól, az **indoklás kötelező** (pl. „2 db elveszett"). A lezárásig minden érték szerkeszthető.

## Lezárás

A **Leltár lezárása** minden eltérő tételre **korrekciós mozgást** hoz létre, majd a készlet a számolt értékre áll be. Feltétel, hogy minden tétel meg legyen számolva, és hogy a korrekció után a készlet ne legyen kisebb a foglaltnál — ilyenkor előbb oldd fel a foglalást. A lezárás újra is futtatható: ha megszakadt, ugyanazt a korrekciót nem alkalmazza kétszer. Lezárt leltár nem módosítható.

## Kapcsolódó fejezetek

- [Készletlista és adatlap — foglalás](/help/keszlet-lista)
- [Raktárhelyek](/help/keszlet-raktarhelyek)

_Utolsó frissítés: 2026-11_
