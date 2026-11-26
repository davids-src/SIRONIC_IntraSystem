---
title: Projektek — lista és összesítő
description: A projektek keresése, szűrése állapot szerint, összesítő csempék és új projekt felvétele.
order: 1
section: Projektek
permissions:
  - projekt:projekt:read
---

## Hol találod

**Oldalsáv → Projektek → Projektek** (`/projekt`)

## Mit látsz

A lap tetején négy csempe mutatja a helyzetet:

- **Nyitott** — folyamatban lévő projektek;
- **Felfüggesztett** — megállított projektek;
- **Lezárt** — befejezett projektek;
- **Lejárt határidejű** — nyitott projektek, amelyek határideje elmúlt.

Alatta a projektek táblázata: azonosító (`PRJ-000001`), név, partner, **állapot**, felelős, határidő, készültség százalékban és az, hogy látható-e a partnernek. A keresés, szűrés és az oszlopbeállítás a többi listáéval azonos. A sorra kattintva megnyílik a projekt adatlapja.

Az **Archiváltak mutatása** gombbal az archivált projektek is megjelennek; alapból el vannak rejtve.

## Új projekt felvétele

Az **Új projekt** gombbal (`projekt:projekt:write` jogosultsággal) add meg a projekt nevét (kötelező), a partnert, a felelőst, a kategóriát, a tervezett órákat, a kezdetet és a határidőt. A partner nevét a rendszer a mentéskor eltárolja, így a lista akkor is a régi nevet mutatja, ha a partner később átnevezésre kerül. A **Látható a partnernek** jelölőnégyzet dönti el, hogy a projekt megjelenhet-e a (későbbi) partnerportálon; a **belső jegyzetet** a partner soha nem látja.

Az új projekt **nyitott** állapotban jön létre. Fázisokat és ellenőrzőlistát az adatlapon vehetsz fel.

## Kapcsolódó fejezetek

- [Projekt adatlapja — fázisok, ellenőrzőlista, staging linkek](/help/projekt-adatlap)
- [Projektköltségek](/help/projekt-koltsegek)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
