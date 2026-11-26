---
title: Számlák
description: Számlák állapota, kiállítás a Billingóban, lejárat és kifizetés.
order: 3
section: Bizonylatok
permissions:
  - bizonylat:szamla:read
---

## Hol találod

**Oldalsáv → Bizonylatok → Számlák** (`/bizonylat/szamlak`)

## Mit látsz

Táblázat a számlákról: belső azonosító (`SZA-000042`), a Billingótól kapott számlaszám, partner, állapot, összeg és esedékesség.

## Állapotok

Piszkozat → Elküldve → Kifizetve; Sztornó. A **Lejárt** állapotot a rendszer megjelenítéskor számolja: az esedékességét meghaladó „Elküldve” számla lejártnak látszik, de nem módosul az adatbázisban. A kiállított (nem piszkozat) számla tartalma nem szerkeszthető.

## Kiállítás és kifizetés

A számlát a Billingo állítja ki (a piszkozatnál **Kiállítás a Billingóban**, `bizonylat:szamla:kiallit`). A kifizetést a Billingo értesítése automatikusan rögzíti; kézzel is jelölhető (**Kifizetve**), vagy lekérdezhető a Billingóból. A sztornó (`bizonylat:szamla:delete`) csak a rendszerbeli állapotot állítja — a Billingóban külön kell sztornózni.

## Archiválás

Okkal archiválható, visszaállítható.

## Kapcsolódó fejezetek

- [Teljesítésigazolások](/help/teljesitesigazolasok)
- [Jótállási jegyek](/help/jotallasi-jegyek)

_Utolsó frissítés: 2026-11_
