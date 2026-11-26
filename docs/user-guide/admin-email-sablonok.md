---
title: E-mail sablonok
description: Rendszerüzenetek (meghívó, jelszó-visszaállítás) szövegének testreszabása.
order: 3
section: Adminisztráció
permissions:
  - mail:manage
---

## Hol találod

**Oldalsáv → Adminisztráció → E-mail sablonok** (`/admin/mail-templates`)

## Mit tehetsz itt

A rendszer minden automatikus e-mailje (meghívó, jelszó-visszaállítás, értesítő e-mailek) egy adatbázisban tárolt sablonból épül fel. Itt szerkesztheted a sablonok tárgyát és szövegét kódmódosítás nélkül.

Egy sablon megnyitásakor (`/admin/mail-templates/[id]`) módosíthatod:

- a tárgyat és a HTML tartalmat,
- opcionálisan, hogy mely szerepkörök vagy felhasználók kapjanak értesítést, ha a sablon egy belső értesítés (nem közvetlenül a végfelhasználónak szóló e-mail).

## Értesítő e-mailek

Az **Új feladat** (`ertesites_feladat_uj`), **Feladat változás** (`ertesites_feladat_valtozas`) és **Jelzés** (`ertesites_jelzes`) sablonok azoknak a felhasználóknak mennek, akik az Értesítési központban maguknak bekapcsolták az adott kategóriát (lásd [E-mail értesítések](/help/ertesitesek-email)). A sablonok a rendszer indulásakor maguktól létrejönnek, ha még nincsenek meg; a meglévő, általad szerkesztett szöveget nem írják felül.

- Használható változók: `{{name}}` (a címzett neve), `{{cim}}` (az értesítés címe), `{{szoveg}}` (a rövid szöveg), `{{link}}` (a feladat vagy jelzés teljes címe).
- Ezek személyes levelek: a sablonon beállított szerepkörök / felhasználók **nem** kapnak belőlük másolatot.
- Ha egy sablont kikapcsolsz, abból a kategóriából senki nem kap e-mailt, akárhogy állította be.

## Válasz-cím (Reply-To)

A kimenő e-mailek válasz-címe mindig azé a felhasználóé, aki a műveletet kiváltotta (pl. aki a meghívást elküldte) — így a válasz közvetlenül hozzá érkezik.

## Kapcsolódó fejezetek

- [Felhasználók kezelése](/help/admin-felhasznalok)
- [E-mail értesítések](/help/ertesitesek-email)

_Utolsó frissítés: 2026-11_
