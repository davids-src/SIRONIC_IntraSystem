---
title: Titok adatlapja — megjelenítés és másolás
description: Egy titok értékének megjelenítése, másolása, szerkesztése, törlése és a hozzáférési napló.
order: 2
section: Titoktár
permissions:
  - secrets:titok:read
---

## Hol találod

**Oldalsáv → Titoktár → Titkok →** kattintás egy sorra (`/secrets/<azonosító>`)

## Érték megjelenítése

1. Az **Érték** kártyán az érték csillagokkal van elfedve.
2. Kattints a **Megjelenítés** gombra (`secrets:titok:reveal` jogosultság kell). A szerver ekkor fejti vissza az értéket.
3. A **Másolás** gombbal a vágólapra teheted.
4. Az érték **10 másodperc múlva automatikusan elrejtődik**, vagy az **Elrejtés** gombbal azonnal.

Minden megjelenítés **naplózódik** (ki és mikor). Ha a napló írása nem sikerül, az érték nem jelenik meg.

## Szerkesztés és törlés

- **Szerkesztés**: a tulajdonos, illetve akinek a titkot szerkesztési szinten osztották meg (`secrets:titok:write`). Az érték mezőt üresen hagyva a mentett érték nem változik; a mentett érték biztonsági okból nem töltődik vissza az űrlapba.
- **Törlés**: csak a tulajdonos (`secrets:titok:delete`), megerősítés után; a megosztások is törlődnek.

## Hozzáférési napló

A tulajdonos az adatlap alján látja, ki jelenítette meg a titkot és mikor.

## Kapcsolódó fejezetek

- [Titoktár — titkok listája](/help/titoktar)
- [Titok megosztása](/help/titoktar-megosztas)

_Utolsó frissítés: 2026-11_
