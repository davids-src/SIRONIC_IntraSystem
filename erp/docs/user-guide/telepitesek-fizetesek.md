---
title: Csomagok és fizetések
description: Számlázási csomagok, időszakok generálása, késedelmes díjak, fizetettnek jelölés és elengedés.
order: 2
section: Telepítések
permissions:
  - deployments:csomag:read
  - deployments:fizetes:read
---

## Hol találod

**Oldalsáv → Telepítések → Csomagok** (`/telepitesek/csomagok`) és **Fizetések** (`/telepitesek/fizetesek`).

## Csomagok

A csomag kódot, nevet, díjat, alap számlázási ciklust (havi, negyedéves, éves) és erőforrás-adatokat tartalmaz. Szerkesztés és új csomag: `deployments:csomag:write`. Használatban lévő csomag nem törölhető; ilyenkor inaktiválni érdemes.

## Számlázás beállítása

A telepítés adatlapján választható csomag, ciklus-felülírás és egyedi ár, valamint hogy a számlázás azonnal vagy a következő hónap elsején induljon (`deployments:fizetes:write`).

## Fizetések

A mutatók: esedékes, késedelmes, késedelmes összeg és a hónapban fizetettek. A **Nyitott díjak** listában a késedelmesek állnak elöl.

- **Időszakok generálása**: létrehozza az esedékes számlázási időszakokat; ismételt futtatás nem hoz létre duplikátumot.
- **Fizetettnek jelöl**: rögzíti a befizetést (`deployments:fizetes:write`).
- **Elenged**: kötelező indokkal elengedi a díjat (`deployments:fizetes:delete`).

A késedelem nem külön állapot: az időszak végének lejártából számolódik, ezért a tárolt állapot "esedékes" marad. A késedelmes díjak a Feladatok teendői között is megjelennek.

## Kapcsolódó fejezetek

- [Telepítések és kiépítési lépések](/help/telepitesek-lista)
- [Integrációk és stack sablonok](/help/telepitesek-integraciok)

_Utolsó frissítés: 2026-11_
