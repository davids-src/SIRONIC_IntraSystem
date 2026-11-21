---
title: Projekt adatlapja — fázisok, ellenőrzőlista, staging linkek
description: Egy projekt állapota, fázisai százalékos készültséggel, kötelező csatolmányos ellenőrzőlistája, staging linkjei, alaprajzai és archiválása.
order: 2
section: Projektek
permissions:
  - projekt:projekt:read
---

## Hol találod

**Oldalsáv → Projektek → Projektek**, majd a projekt sorára kattintva (`/projekt/<azonosító>`).

## Állapot

A fejlécben látod az állapotot (**nyitott**, **felfüggesztett**, **lezárt**), a készültséget és az archiválás tényét. A gombokkal (`projekt:projekt:write` jogosultsággal) felfüggeszthetsz, újranyithatsz vagy lezárhatsz egy projektet. **Lezárni csak akkor lehet, ha minden kötelező ellenőrzőlista-tétel kész** — a hibaüzenet felsorolja a hiányzókat. Az állapotváltások előzménye megmarad.

A **Látható a partnernek** kapcsolóval állítod, hogy a projekt megjelenjen-e a partnernek. A partner kizárólag a saját, látható, nem archivált projektjeit látja: a fázisokat és a staging linkeket, de soha a belső jegyzetet, az ellenőrzőlistát és a költségeket.

## Fázisok

A fázisok három oszlopban jelennek meg: **Függőben**, **Folyamatban**, **Kész**. Minden fázisnak lehet határideje és százalékos készültsége. A kész fázis automatikusan 100%-os, a 100%-os fázis automatikusan kész. A projekt összkészültsége a fázisok átlaga.

## Ellenőrzőlista

Tételeket vehetsz fel kategóriával, és megjelölheted őket **Kötelező**nek (nélkülük a projekt nem zárható le) vagy **Csatolmány kell**nek. Utóbbit csak akkor lehet késznek jelölni, ha legalább egy fájl (kép vagy PDF) csatolva van; az utolsó csatolmány a kész tételről nem törölhető. A fájlfeltöltéshez médiatár-feltöltési jogosultság (`media:upload`) kell. Az **Alkalmaz** gombbal egy [ellenőrzőlista-sablon](/help/projekt-sablonok) tételei adhatók hozzá egyszerre.

## Staging linkek

A kiadás előtti tesztoldalak linkjei jóváhagyási állapottal: **Jóváhagyásra vár**, **Jóváhagyva**, **Módosítás kérve**. Csak http(s) cím adható meg.

## Alaprajzok

Alaprajz fájl (kép vagy PDF) feltölthető névvel; a rendszer csak a fájlhivatkozást őrzi.

## Archiválás

A projekt nem törölhető, hanem archiválható — az **ok megadása kötelező**. Archivált projekt nem módosítható, a listából eltűnik, de az **Archiváltak mutatása** gombbal elérhető, és visszaállítható. Törölni (`projekt:projekt:delete`) csak költség nélküli projektet lehet.

## Kapcsolódó fejezetek

- [Projektek — lista és összesítő](/help/projekt-lista)
- [Projektköltségek](/help/projekt-koltsegek)
- [Ellenőrzőlista-sablonok](/help/projekt-sablonok)

_Utolsó frissítés: 2026-11_
