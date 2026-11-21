---
title: Szerződések és sablonok
description: Szerződések sablonból vagy feltöltéssel, változók, aláírás, állapotok és a szerződés-sablonok kezelése.
order: 3
section: Értékesítés
permissions:
  - ertekesites:szerzodes:read
---

## Hol találod

**Oldalsáv → Értékesítés → Szerződések** (`/ertekesites/szerzodesek`). A sablonok: **Szerződések → Sablonok** (`/ertekesites/szerzodesek/sablonok`).

## Mit látsz

Táblázat a szerződésekről: azonosító (`SZ-000042`), név, partner, típus, állapot, érvényesség. A törölt szerződések alapból rejtve vannak.

## Két típus

- **Sablonból generált**: válassz sablont, töltsd ki a sablon változóit (pl. díj, határidő). A partner neve automatikusan kitöltődik. A szöveg **minden mentéskor újragenerálódik** a szerződés létrehozásakor mentett sablonszövegből — a sablon későbbi módosítása a meglévő szerződéseket nem érinti.
- **Feltöltött**: a PDF-et a médiatárba töltsd fel, és a szerződésnél add meg a fájl hivatkozását.

A típus létrehozás után nem módosítható.

## Állapotok

Piszkozat → Elküldve → Digitálisan aláírt / Papíron aláírt; bármikor Törölt (ez külön jogosultság: **Szerződés törlése**, `ertekesites:szerzodes:delete`). A szerződés tartalma **csak Piszkozat állapotban** szerkeszthető. Digitális aláírásnál az aláíró nevét meg kell adni; csak „Digitális” aláírási módú szerződés jelölhető digitálisan aláírtnak.

## Sablonok kezelése

A **Szerződések kezelése** (`ertekesites:szerzodes:write`) jogosultsággal létrehozhatsz és módosíthatsz sablonokat. A szövegben `{{változó}}` helyőrzőket használhatsz; a rendszer felismeri őket, és a szerződés létrehozásakor bekéri az értéküket. A `{{partner_nev}}` automatikus. A beírt értékek biztonságosan kerülnek a szövegbe (a HTML-t a rendszer megtisztítja).

## Kapcsolódó fejezetek

- [Ajánlatok — lista és állapotok](/help/ajanlatok)
- [Megrendelőlapok](/help/megrendelolapok)
- [Partner adatlapja](/help/partner-adatlap)

_Utolsó frissítés: 2026-11_
