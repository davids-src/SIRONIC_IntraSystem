---
title: Raktárhelyek
description: Fa szerkezetű raktárhely-kódok felvétele, típusok, törlés feltételei.
order: 6
section: Készlet
permissions:
  - keszlet:keszlet:read
---

## Hol találod

**Oldalsáv → Készlet → Raktárhelyek** (`/keszlet/raktarhelyek`)

## Kódok

A kód fa szerkezetű: a „/” mélyebb szintet jelent, pl. `FO` (főraktár), `FO/A` (A polc), `FO/A/12`. Alszintet csak létező szülő alá vehetsz fel. A kód felvétel után nem módosítható, mert a készlettételek hivatkoznak rá.

## Felvétel és törlés

A **Felvétel** (`keszlet:keszlet:write`) kódot, nevet és típust (főraktár, autó, selejt, polc) kér. Törölni csak olyan raktárhelyet lehet, amely alatt nincs további raktárhely, és amelyen nincs készlettétel.

## Kapcsolódó fejezetek

- [Készletlista és adatlap — foglalás](/help/keszlet-lista)
- [Leltár](/help/keszlet-leltar)

_Utolsó frissítés: 2026-11_
