---
title: Körüzenet és frissítési jegyzet küldése
description: Jelzés küldése kiválasztott felhasználóknak, szerepköröknek, egy jogosultság birtokosainak vagy mindenkinek — igény szerint asztali értesítéssel; az elküldött üzenetek olvasottsága.
order: 6
section: Adminisztráció
permissions:
  - jelzes:kuld
---

## Hol találod

- **Oldalsáv → Általános → Értesítések → Körüzenet küldése** gomb (`/jelzesek/kuldes`).
- Csak a _Körüzenet küldése_ (`jelzes:kuld`) jogosultsággal látszik. Az Administrator szerepkör automatikusan tartalmazza; másnak a [Szerepkörök és jogosultságok](/help/admin-szerepkorok) oldalon adható.

## Üzenet küldése

1. **Típus** — válaszd a **Körüzenet** (általános tájékoztatás) vagy a **Frissítési jegyzet** lehetőséget. A frissítési jegyzet a címzetteknél **Újdonság** jelöléssel, kiemelten jelenik meg — a RecPlus új funkcióinak bejelentésére való.
2. **Cím** — rövid, egyértelmű (legfeljebb 140 karakter). Ez jelenik meg a csengő paneljén és az asztali értesítésben.
3. **Szöveg** — nem kötelező, egyszerű szöveg; a sortörések megmaradnak.
4. **Link** — nem kötelező. A jelzésre kattintva ez nyílik meg: RecPlus-oldal „/”-rel kezdve (például `/help/jelzesek`), vagy `https://` kezdetű külső cím.
5. **Címzettek** — bármilyen kombinációban:
   - **Mindenki** — minden aktív felhasználó (a többi választást ilyenkor figyelmen kívül hagyja);
   - **Felhasználók** — egyenként kiválasztva, névre vagy e-mailre kereshető;
   - **Szerepkörök** — a szerepkör minden tagja;
   - **Jogosultság birtokosai** — aki szerepkörön keresztül vagy közvetlenül megkapta a kiválasztott jogosultságot.
     Egy ember akkor is csak egyszer kapja meg, ha több választás is érinti. Letiltott fiók nem kap jelzést.
6. **Asztali értesítés (push) is** — bejelölve azoknál is felugrik, akik az eszközükön bekapcsolták az értesítéseket. A jelzés enélkül is megjelenik a csengőnél.
7. Az oldal alján látod, **hány aktív felhasználó** kapja meg. A **Küldés** gomb megerősítés után küld; elküldött üzenet nem vonható vissza.

## Elküldött jelzések

Az űrlap alatti táblázat a körüzeneteket és frissítési jegyzeteket mutatja, a legújabbal kezdve: cím és típus, a címzettek köre és száma, ki küldte, mikor, és hányan olvasták el (darab és százalék). A rendszer automatikus jelzései (feladatok, kérelmek) itt nem szerepelnek.

## Kapcsolódó fejezetek

- [Jelzések — értesítésközpont](/help/jelzesek)
- [Szerepkörök és jogosultságok](/help/admin-szerepkorok)
- [Felhasználók kezelése](/help/admin-felhasznalok)

_Utolsó frissítés: 2026-11_
