---
title: Projektköltségek
description: Üzemanyag, parkolás, autópálya, szállás és anyagköltségek rögzítése projektenként, bizonylattal.
order: 3
section: Projektek
permissions:
  - projekt:koltseg:read
---

## Hol találod

**Oldalsáv → Projektek → Költségek** (`/projekt/koltsegek`), vagy a projekt adatlapján a **Költségek** gombbal (az adott projektre szűrve).

## Mit látsz

Az összes rögzített költség táblázata: dátum, típus (üzemanyag, parkolás, autópálya, szállás, anyag, egyéb), leírás, **nettó összeg**, pénznem és a rögzítő neve. Az **Archiváltak mutatása** gombbal az archivált tételek is megjelennek.

## Költség rögzítése

Az **Új költség** gombbal (`projekt:koltseg:write` jogosultsággal) válassz projektet, típust, dátumot és add meg a nettó összeget; opcionálisan feltölthetsz bizonylatot (kép vagy PDF). Archivált projekthez nem rögzíthető költség.

A táblázat sorára kattintva szerkesztheted a költséget, itt archiválhatod is — az **ok megadása kötelező**, és később visszaállítható. Végleges törlés külön jogosultsággal (`projekt:koltseg:delete`) lehetséges.

A költségeket a partner soha nem látja.

## Kapcsolódó fejezetek

- [Projekt adatlapja](/help/projekt-adatlap)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
