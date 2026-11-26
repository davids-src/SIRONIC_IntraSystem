---
title: Eszközök — lista és összesítő
description: A szerszámok és eszközök nyilvántartása — összesítő csempék, keresés, szűrés állapot szerint, új eszköz felvétele.
order: 1
section: Eszközök
permissions:
  - eszkoz:eszkoz:read
---

## Hol találod

**Oldalsáv → Eszközök → Eszközök** (`/eszkoz`)

## Mit látsz

A lap tetején négy csempe mutatja a helyzetet:

- **Összes eszköz** — minden eszköz a kivontak nélkül;
- **Kiadva** — jelenleg valakinél lévő eszközök;
- **Szervizben** — javításon lévő eszközök;
- **Elveszett** — elveszettnek jelölt eszközök.

Alatta az eszközök táblázata: megnevezés, márka, típusszám, gyári szám, **állapot** (raktáron, kiadva, szervizben, elveszett, kivonva), **fizikai állapot** (új, jó, megfelelő, rossz) és az, hogy kinél van éppen. A táblázat keresése, szűrése és oszlopbeállítása a többi listáéval azonos. A sorra kattintva megnyílik az eszköz adatlapja.

## Új eszköz felvétele

Az **Új eszköz felvétele** gombbal (`eszkoz:eszkoz:write` jogosultsággal) add meg a megnevezést (kötelező), a márkát, a típusszámot, a gyári számot, a fizikai állapotot és egy jegyzetet. Az új eszköz **raktáron** állapotban jön létre. Két eszköznek nem lehet azonos a gyári száma.

## Kapcsolódó fejezetek

- [Eszköz adatlapja — kiadás, visszavétel, szerviz](/help/eszkoz-adatlap)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
