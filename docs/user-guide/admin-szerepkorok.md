---
title: Szerepkörök és jogosultságok
description: Szerepkörök, a jogaik és a hozzájuk tartozó felhasználók egy helyen — hogyan adódnak össze a jogok.
order: 2
section: Adminisztráció
permissions:
  - roles:manage
---

## Hol találod

**Oldalsáv → Adminisztráció → Szerepkörök** (`/admin/permissions`)

## Hogyan működik

A jogosultságok **jogkulcsokból** (pl. `users:read`, `hr:szabadsag:jovahagy`) állnak, a **szerepkörök** pedig ezek csomagjai. Egy felhasználó jogai:

- **minden** jog, amit **bármelyik** szerepköre ad — ezek összeadódnak;
- plusz az **egyedi többletjogok**, amelyeket a felhasználó adatlapján egyenként jelölsz be.

Egyedi joggal **csak hozzáadni** lehet, elvenni nem. Ha valakinek egy szerepkör túl sokat ad, ne kapja meg azt a szerepkört, hanem hozz létre neki egy szűkebbet.

**Ajánlott működés:** minden munkakörhöz egy szerepkör (pl. Gépkezelő, HR, Ügyvezető), és az embereket a szerepkör kártyáján add hozzá. Ha egy szerepkör jogain változtatsz, az mindenkire azonnal érvényes, akinek megvan; egyedi jogokat csak kivételes esetben használj.

## Ki van egy szerepkörben

Minden szerepkör fejlécén látod, hány jogot ad és **hány felhasználónak** van meg. A kártyát lenyitva a **Felhasználók ezzel a szerepkörrel** blokkban:

- a nevek listája — névre kattintva a felhasználó adatlapja nyílik, az inaktív fiókok halványan látszanak;
- a név melletti **×** elveszi a szerepkört;
- a **Felhasználó hozzáadása** mezőbe nevet vagy e-mailt írva, majd a találatra kattintva megadod neki.

Így a szerepkörök kiosztásához nem kell a felhasználók oldalára átmenni. Az utolsó aktív adminisztrátortól az admin szerepkör nem vehető el.

## Baseline jogosultságok szinkronizálása

A lap tetején lévő **Baseline jogosultságok szinkronizálása** gomb frissíti az összes rendszer jogkulcsot és a rendszer szerepkörök (pl. `admin`) jogait a jelenlegi verzió szerint. Egyedi (nem rendszer) szerepkörök érintetlenek maradnak. Ezt érdemes lefuttatni, ha:

- frissítés után új jogkulcsok jelentek meg a rendszerben,
- egy rendszer szerepkör (pl. `admin`) hiányos jogokkal rendelkezik.

A szinkron után frissítsd az oldalt — a jogosultságok azonnal érvénybe lépnek, nem szükséges új bejelentkezés.

## Szerepkör jogainak módosítása

Nyisd meg a szerepkör kártyáját, és a jelölőnégyzetekkel kapcsold ki/be az egyes jogokat. A **rendszer `admin` szerepkör jogai zárolva vannak** — ez mindig minden jelenleg regisztrált jogkulcsot tartalmaz, és nem szerkeszthető soronként (a szinkron gombbal frissül).

## Új szerepkör létrehozása

A **Új szerepkör** panelben adj meg egy kulcsot (pl. `sales_rep`) és egy megjelenítendő nevet, majd hozd létre. Utána a szerepkör kártyáján kapcsold be a szükséges jogokat.

## Kapcsolódó fejezetek

- [Felhasználók kezelése](/help/admin-felhasznalok)
- [Fiókod és jogosultságaid](/help/fiok)

_Utolsó frissítés: 2026-11_
