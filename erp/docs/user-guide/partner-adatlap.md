---
title: Partner adatlapja
description: Partner adatai, kapcsolattartók, árazási profil, szerkesztés és archiválás.
order: 2
section: Partnerek
permissions:
  - partner:partner:read
---

## Hol találod

**Oldalsáv → Partnerek → Partnerek**, majd kattints egy partnerre (`/partner/[id]`). Szerkesztés: **Szerkesztés** gomb (`/partner/[id]/edit`).

## Mit látsz

- **Alapadatok** — adószám, cégjegyzékszám, bankszámlaszám, telefon, e-mail, székhely és (ha eltér) számlázási cím, megjegyzés.
- **Kapcsolattartók** — több személy is felvehető; egyikük az **elsődleges**, ő jelenik meg a partnerlistában.
- **Árazási profil** — a partner szerepe (ügyfél, alvállalkozó-megbízó, beszállító, vegyes), ügyfélkategória (magánszemély, kkv, nagyvállalat), árazási szerződéstípus (eseti, 6 hónapos, 1 éves, 2 éves), a szerződés kezdete és vége, valamint hány nappal a lejárat előtt kérsz emlékeztetőt. Az Árlista modul ezekből választja ki a partnerre érvényes árszorzót.
- **Alvállalkozói adatok** — munkaterületek, jelenlét típusa és számlázási ciklus; csak akkor jelenik meg, ha kitöltötted.

## Partner szerkesztése

A **Szerkesztés** gombhoz **Partnerek kezelése** (`partner:partner:write`) jogosultság kell. A kapcsolattartókat soronként adhatod hozzá vagy törölheted; az **Elsődleges** választógombbal jelölöd ki a lista első emberét. A címkéket vesszővel elválasztva add meg. Ha a szerződés vége a kezdete előtt van, a mentés hibaüzenetet ad.

## Archiválás és visszaállítás

A partner nem törölhető, csak **archiválható**. Az **Archiválás** blokkban meg kell adnod az okát; ezután a partner eltűnik az alapértelmezett listából, de az adatlapja megmarad, és az **Archiváltak mutatása** nézetben megtalálod. A **Visszaállítás** gombbal újra aktívvá teheted. Mindkettőhöz **Partnerek archiválása** (`partner:partner:delete`) jogosultság kell.

## Kapcsolódó fejezetek

- [Partnerek — lista](/help/partner-lista)
- [Érdeklődők](/help/erdeklodok)

_Utolsó frissítés: 2026-11_
