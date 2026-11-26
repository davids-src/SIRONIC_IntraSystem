---
title: Készletlista és adatlap — foglalás
description: Készlet termékenként és raktárhelyenként, szűrés raktárhely szerint, foglalás és feloldás, minimum készletszint, mozgásnapló.
order: 2
section: Készlet
permissions:
  - keszlet:keszlet:read
---

## Hol találod

**Oldalsáv → Készlet → Készletlista** (`/keszlet/lista`), majd egy sorra kattintva az adatlap (`/keszlet/lista/<azonosító>`)

## Mit látsz

A táblázat sorai egy termék egy raktárhelyen lévő készletét mutatják: **készlet** (fizikailag ott van), **foglalt** (már le van kötve), **szabad** (készlet − foglalt) és a **minimum**. A **Raktárhely** oszlop szűrőjével egy adott helyre szűkíthetsz. A minimum alatti sorok piros jelzést kapnak. Az **Érték** oszlop csak `keszlet:ertek:read` jogosultsággal látható.

## Adatlap

Az adatlapon a mennyiségek és a teljes **mozgásnapló** látszik (bevételezés, kiadás, korrekció, foglalás, feloldás — a hivatkozott bizonylat típusával). A napló csak bővül, a bejegyzések nem módosíthatók. A beszerzési árat csak a `keszlet:ertek:read` jogosultsággal rendelkezők látják.

## Foglalás és feloldás

A **Foglalás** gombbal (`keszlet:foglalas:write`) mennyiséget kötsz le egy munkához. A rendszer **nem enged többet foglalni, mint a szabad készlet**: a kapott hibaüzenet megmutatja, mennyi a szabad. A **Foglalás feloldása** gomb visszaadja a lekötött mennyiséget; többet nem oldhatsz fel, mint amennyi foglalt. A foglalt mennyiség nem adható ki szabad kiadásként, csak a saját foglalásából.

## Minimum készletszint

A **Minimum beállítása** gombbal (`keszlet:keszlet:write`) megadhatod, mely szinten számít kritikusnak a tétel. Üresen hagyva a tétel nincs figyelve.

## Kapcsolódó fejezetek

- [Készlet — műszerfal](/help/keszlet-muszerfal)
- [Bevételezés](/help/keszlet-bevetelezes)
- [Leltár](/help/keszlet-leltar)

_Utolsó frissítés: 2026-11_
