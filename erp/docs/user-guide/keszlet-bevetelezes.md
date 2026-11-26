---
title: Bevételezés
description: Áru bevételezése a raktárba az árlista termékeiből, raktárhely és beszerzési ár megadásával.
order: 3
section: Készlet
permissions:
  - keszlet:bevetel:write
---

## Hol találod

**Oldalsáv → Készlet → Bevételezés** (`/keszlet/bevetel`)

## Lépések

1. **Tételek** — keress rá az árlista termékére (név vagy kód), add hozzá, majd add meg a mennyiséget és a raktárhelyet. A nettó beszerzési ár mezőt csak `keszlet:ertek:read` jogosultsággal látod; ha kitöltöd, ez lesz a tétel utolsó beszerzési ára.
2. **Ellenőrzés** — összegzés és megjegyzés, majd **Bevételezés rögzítése**.

## Fontos tudnivalók

- Egy bevételezés **többszöri elküldése sem duplázza** a készletet: a rendszer minden rögzítést egyedi azonosítóval lát el, az ismételt küldés változtatás nélkül sikeres.
- A termék neve, kódja és egysége a bevételezés pillanatában kerül a készlettételre, így az árlista későbbi átnevezése nem írja át a mozgásnaplót.
- Ismeretlen raktárhelyre nem lehet bevételezni — előbb vedd fel a raktárhelyet.

## Kapcsolódó fejezetek

- [Készletlista és adatlap — foglalás](/help/keszlet-lista)
- [Raktárhelyek](/help/keszlet-raktarhelyek)

_Utolsó frissítés: 2026-11_
