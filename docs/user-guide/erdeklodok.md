---
title: Érdeklődők
description: Értékesítési érdeklődők követése az első megkereséstől a partnerré válásig.
order: 3
section: Partnerek
permissions:
  - partner:erdeklodo:read
---

## Hol találod

**Oldalsáv → Partnerek → Érdeklődők** (`/partner/erdeklodok`). Egy érdeklődő adatlapja: `/partner/erdeklodok/[id]`.

## Mit látsz

A lista az érdeklődőket mutatja azonosítóval (pl. `E-000007`), cégnévvel, kapcsolattartóval, **állapottal**, felelőssel, becsült értékkel és a következő lépéssel. A táblázat a megszokott módon szűrhető és rendezhető; az archivált érdeklődők az **Archiváltak mutatása** gombbal jelennek meg.

## Állapotok

Célpont → Megkeresve → Válaszolt → Találkozó → Árajánlat szükséges → Árajánlat elküldve → Utánkövetés → Tárgyalás → **Megnyert**. Lezáró vagy félretett állapotok: Elveszett, Nincs válasz, Később, Nem releváns. Az **Elveszett** állapothoz meg kell adnod az elvesztés okát.

## Új érdeklődő és szerkesztés

Az **Új érdeklődő** gombhoz és a szerkesztéshez **Érdeklődők kezelése** (`partner:erdeklodo:write`) jogosultság kell. Csak a cégnév kötelező. A **következő lépés** és határideje alapján az érdeklődő megjelenik a felelős Teendőim listájában (amíg nincs lezárva).

## Az adatlapon végezhető műveletek

- **Állapot módosítása** — minden váltás bekerül a tevékenységnaplóba.
- **Tevékenység rögzítése** — telefonhívás, e-mail, találkozó, jegyzet vagy utánkövetés, rövid leírással.
- **Én leszek a felelős** / **Felelős törlése**.
- **Partnerré alakítás** — létrehoz egy partnert az érdeklődő adataiból, összekapcsolja vele, és az érdeklődőt „Megnyert” állapotba teszi. Ehhez a **Partnerek kezelése** jogosultság is kell. Ha már át van alakítva, a gomb nem jelenik meg.

## Archiválás

Az érdeklődő nem törölhető, csak archiválható (ok megadásával), és visszaállítható. Ehhez **Érdeklődők archiválása** (`partner:erdeklodo:delete`) jogosultság kell.

## Kapcsolódó fejezetek

- [Partnerek — lista](/help/partner-lista)
- [Partner adatlapja](/help/partner-adatlap)
- [Feladatok — teendőim](/help/feladatok)

_Utolsó frissítés: 2026-11_
