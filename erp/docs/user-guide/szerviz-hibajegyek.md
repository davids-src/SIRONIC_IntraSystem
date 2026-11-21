---
title: Hibajegyek
description: Hibajegy felvétele, állapotváltás, felelős, megjegyzések (belső is).
order: 1
section: Szerviz
permissions:
  - szerviz:hibajegy:read
---

## Hol találod

**Oldalsáv → Szerviz → Hibajegyek** (`/szerviz/hibajegyek`)

## Mit látsz

Csempék (nyitott, új, várakozik, kritikus) és a hibajegyek táblázata: azonosító (`TK-000042`), tárgy, partner, állapot, prioritás, felelős. Az archivált jegyek alapból rejtve vannak.

## Hibajegy felvétele és kezelése

Az **Új hibajegy** gombbal (`szerviz:hibajegy:write`) add meg a tárgyat, a leírást, a partnert vagy az egyszeri ügyfelet, a prioritást és a forrást (telefon, e-mail, személyesen, belső). A partnerportálról érkező jegy forrása „Partnerportál”.

Az adatlapon: **állapotváltás** (Új, Folyamatban, Várakozik, Megoldva, Lezárt — csak az engedett átmenetek), **felelős kijelölése**, megjegyzések és az előzmények. A **Munkalap indítása** gomb előtöltött munkalapot nyit a jegyhez.

## Belső megjegyzések

A `szerviz:hibajegy:belso` jogosultsággal belső megjegyzés és belső jegyzet is írható és olvasható (sárga háttér). Ezeket, valamint a felelőst a partner a portálon soha nem látja; jogosultság nélkül Te sem.

## Archiválás

Archiváláshoz az okot kötelező megadni. A visszaállítás önálló jogosultság (`szerviz:hibajegy:delete`).

## Kapcsolódó fejezetek

- [Munkalapok](/help/szerviz-munkalapok)
- [Karbantartási tervek](/help/szerviz-karbantartas)

_Utolsó frissítés: 2026-11_
