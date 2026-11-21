---
title: Ellenőrzőlista-sablonok
description: Újrahasznált tételsorok (pl. kamera telepítés, IT audit), amelyek egy kattintással projektre alkalmazhatók.
order: 5
section: Projektek
permissions:
  - projekt:sablon:read
---

## Hol találod

**Oldalsáv → Projektek → Ellenőrzőlista-sablonok** (`/projekt/sablonok`)

## Mit látsz

A sablonok táblázata: név, kategória és a tételek száma. Az **Archiváltak mutatása** gombbal az archivált sablonok is látszanak.

## Sablon készítése

Az **Új sablon** gombbal (`projekt:sablon:write` jogosultsággal) add meg a nevet, a kategóriát és a tételeket. Minden tételnél jelölhető, hogy **kötelező** (nélküle a projekt nem zárható le), illetve hogy **csatolmány kell** hozzá. A tételek sorrendje a lista sorrendje.

## Alkalmazás projektre

A projekt adatlapján, az **Ellenőrzőlista** blokkban válaszd ki a sablont és kattints az **Alkalmaz** gombra: a tételek hozzáadódnak a meglévők után. Az alkalmazott tételek másolatok — a sablon későbbi módosítása vagy törlése nem érinti őket.

## Archiválás és törlés

A sablon archiválható (ok kötelező) és visszaállítható; archivált sablon nem alkalmazható. Végleges törlés külön jogosultsággal (`projekt:sablon:delete`) lehetséges.

## Kapcsolódó fejezetek

- [Projekt adatlapja](/help/projekt-adatlap)

_Utolsó frissítés: 2026-11_
