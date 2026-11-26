---
title: Készlet — műszerfal
description: Teljes készletérték, kritikus és elfekvő tételek, aktív RMA ügyek, készlet raktárhelyenként és a legutóbbi mozgások.
order: 1
section: Készlet
permissions:
  - keszlet:keszlet:read
---

## Hol találod

**Oldalsáv → Készlet → Műszerfal** (`/keszlet`)

## Mit látsz

Négy csempe:

- **Teljes készletérték** — a készlet értéke az utolsó beszerzési áron. Csak akkor látod, ha van `keszlet:ertek:read` jogosultságod; nélküle a csempe nem jelenik meg.
- **Alacsony készletű tételek** — hány tétel van a beállított minimum szinten vagy alatta.
- **Aktív RMA ügyek** — a még le nem zárt (beérkezett, beszállítónak elküldött) ügyek; a csempére kattintva az RMA lista nyílik.
- **Raktárhelyek** — a felvett raktárhelyek száma.

Alatta négy blokk:

- **Készlet raktárhelyenként** — sávdiagram érték (ha láthatod) vagy darabszám szerint.
- **Kritikus szintű tételek** — a minimum alatti tételek, a legfeljebb 10 legkritikusabb.
- **Elfekvő készlet** — a pozitív készletű tételek, amelyek 90 napja nem mozogtak (bevételezés, kiadás, leltári korrekció; a foglalás nem számít mozgásnak).
- **Legutóbbi mozgások** — a 10 legfrissebb bevételezés, kiadás, korrekció, foglalás.

A felső gombokkal indíthatsz bevételezést vagy leltárat (jogosultság szerint).

## Kapcsolódó fejezetek

- [Készletlista és adatlap — foglalás](/help/keszlet-lista)
- [Bevételezés](/help/keszlet-bevetelezes)
- [RMA ügyek](/help/keszlet-rma)

_Utolsó frissítés: 2026-11_
