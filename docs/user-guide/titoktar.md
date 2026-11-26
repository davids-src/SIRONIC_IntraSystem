---
title: Titoktár — titkok listája
description: Jelszavak és hozzáférések titkosított tárolása, saját és megosztott titkok listája.
order: 1
section: Titoktár
permissions:
  - secrets:titok:read
---

## Hol találod

**Oldalsáv → Titoktár → Titkok** (`/secrets`)

## Mit látsz

A lista a **saját** és a **veled megosztott** titkokat mutatja: név, leírás, tulajdonos, utolsó módosítás (a Partner oszlop az Oszlopok panelben kapcsolható be). A listában **soha nem jelenik meg az érték** — az csak az adatlapon, kérésre fejthető vissza. A keresés, szűrés és rendezés a többi listáéval azonos (lásd [Listák és táblázatok használata](/help/tablazatok)).

Más felhasználó titkát nem látod, amíg meg nem osztják veled — a rendszergazda sem lát mindent automatikusan.

## Új titok felvétele

1. Kattints az **Új titok** gombra (`secrets:titok:write` jogosultság kell).
2. Add meg a nevet (például „Ügyfél adatbázis jelszó”) és az értéket; opcionálisan leírást és a kapcsolódó partner azonosítóját.
3. Mentés után az érték titkosítva tárolódik, és te leszel a tulajdonosa.

## Fontos

- A titkosításhoz a szerveren be kell állítani a `SECRETS_ENCRYPTION_KEY` értéket. Ha hiányzik, a mentés hibával leáll — ilyenkor szólj a rendszergazdának.
- A kulcs elvesztése esetén minden titok olvashatatlanná válik.

## Kapcsolódó fejezetek

- [Titok adatlapja — megjelenítés és másolás](/help/titoktar-adatlap)
- [Titok megosztása](/help/titoktar-megosztas)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
