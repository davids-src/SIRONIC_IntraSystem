---
title: Integrációk és stack sablonok
description: Cloudflare, NPM, Portainer és GitHub kapcsolatok titkosított hitelesítéssel, teszt gomb és compose sablonok.
order: 3
section: Telepítések
permissions:
  - deployments:integracio:read
  - deployments:sablon:read
---

## Hol találod

**Oldalsáv → Telepítések → Integrációk** (`/telepitesek/integraciok`) és **Stack sablonok** (`/telepitesek/sablonok`).

## Integrációk

Minden szolgáltatóhoz (Cloudflare, NPM, Portainer, GitHub) felvehető kapcsolat: címke, alap URL és hitelesítő adat. A hitelesítő adatok titkosítva tárolódnak, és sehol a felületen nem jelennek meg, sem listában, sem szerkesztéskor, sem a naplóban. Szerkesztéskor az üresen hagyott mező a tárolt értéket tartja meg.

A **Teszt** gomb (`deployments:integracio:write`) egy valódi, csak olvasó hívással ellenőrzi a kapcsolatot, és csak az eredményt írja ki. A belső hálózati, önaláírt TLS tanúsítvány kapcsolónként engedélyezhető.

## Stack sablonok

A sablon Portainer compose YAML helyőrzőkkel (`{{ DOMAIN }}`, `{{ IMAGE }}` stb.). A helyőrzőket soronként `KULCS|Címke|kötelező|titkos|alapérték` formában deklarálod; a titkos helyőrzők értéke a telepítésben titkosítva tárolódik. Egy sablon lehet alapértelmezett. Használatban lévő sablon nem törölhető.

## Kapcsolódó fejezetek

- [Telepítések és kiépítési lépések](/help/telepitesek-lista)
- [Csomagok és fizetések](/help/telepitesek-fizetesek)

_Utolsó frissítés: 2026-11_
