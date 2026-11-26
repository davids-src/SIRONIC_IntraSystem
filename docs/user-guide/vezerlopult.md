---
title: Vezérlőpult (kezdőoldal)
description: A bejelentkezés utáni nyitóoldal — mutatók, teendők, legutóbbi tevékenység és gyors műveletek a jogosultságaid szerint.
order: 3
section: Áttekintés
---

## Hol találod

**Oldalsáv → Vezérlőpult** (`/`) — bejelentkezés után ez az első oldal.

## Mit látsz

Az oldal tartalma **a jogosultságaidtól függ**: csak azokat a modulokat látod, amelyekhez megtekintési joggal rendelkezel, így mindenki a saját munkájához releváns információt kapja. Ha egy modul nem tud válaszolni, a többi attól még megjelenik.

- **Figyelmet igényel** — mutatócsempék modulonként. A csempe ikonjának és jelölésének színe a súlyosságot mutatja (sárga = figyelmet kér, piros = sürgős); a csempére kattintva a hozzá tartozó lista nyílik. Jelenleg ilyenek:
  - **Partnerek** — a partnerek száma.
  - **Árlista** — az aktív árlistatételek száma.
  - **Készlet** — a minimum szintet elérő tételek és a nyitott RMA-ügyek.
  - **Értékesítés** — az elküldött, még válaszra váró ajánlatok.
  - **Szerviz** — a nyitott hibajegyek (a kritikusak külön jelezve), és a sikertelen készletkiadású munkalapok.
  - **Bizonylatok** — a lejárt számlák és az aláírásra váró teljesítésigazolások.
  - **Projektek** — a nyitott projektek, ebből a késésben lévők.
  - **Eszközök** — a kiadott eszközök, a szervizben lévők és az elveszettek.
  - **Telepítések** — az élő telepítések és a figyelmet igénylők; a késedelmes díjak.
- **Legutóbbi tevékenység** — a hozzáférhető modulok legutóbbi állapotváltozásai időrendben: mi változott, ki változtatta, milyen állapotba került és mikor (az időpontra víve a pontos dátum látszik). A sorra kattintva az adott tétel adatlapja nyílik. Jelenleg az ajánlatok, hibajegyek és számlák állapotváltozásait mutatja.
- **Teendőim** — a rád váró tételek (a hat legsürgősebb), az **Összes** linkre a teljes [Feladatok → Teendőim](/feladatok) lista nyílik. A listában a tételek modulonként kategorizálva látszanak (Eszközök, Partnerek, Projektek, Készlet, Értékesítés, Szerviz, Bizonylatok, Telepítések), a kollégától kapott és a saját feladatok mellett.
- **Gyors műveletek** — gyakori „új felvétele” gombok (új partner, ajánlat, hibajegy, szállítólevél, projekt, eszköz, telepítés, bevételezés), csak ha van hozzá írási jogod.
- **Rendszer** — aktív és inaktív felhasználók száma, csak a Felhasználók megtekintése jogosultsággal.

Ha egyik modulhoz sincs megtekintési jogosultságod, az oldal ezt kiírja; a hozzáférést a rendszergazda állítja be a [Szerepkörök és jogosultságok](/help/admin-szerepkorok) menüben.

## Automatikus teendők és jelzések

A vezérlőpult mellett a rendszer néhány eseményre magától is szól:

- **Elfogadott ajánlat** — az elfogadó kap egy kapcsolt feladatot („Szerződés előkészítése”, 7 napos határidővel) és egy jelzést, hogy készítsen szerződést.
- **Aláírt teljesítésigazolás** — a rendszer számlapiszkozatot készít az igazolás tételeiből, és jelzést küld a számlákat kezelő kollégáknak. A piszkozatot ellenőrizd, majd állítsd ki.
- **Minimum alá csökkenő készlet** — egy kiadás után, ha egy tétel elérte a minimum szintet, jelzést kapnak a készletet kezelők.

Ezek a háttérben, a mentést nem akasztva fut; ha valamelyik nem sikerül, a művelet maga attól még rendben lezárul.

## Kapcsolódó fejezetek

- [Áttekintés és első lépések](/help)
- [Keresés az egész rendszerben](/help/kereses)
- [Feladatok — teendőim, saját és csoportos feladatok](/help/feladatok)
- [Értesítési központ — jelzések](/help/jelzesek)
- [Fiókod és jogosultságaid](/help/fiok)

_Utolsó frissítés: 2026-11_
