---
title: Arculat testreszabása
description: Alkalmazásnév, logó, favicon, színek és a bejelentkezési oldal megjelenésének beállítása.
order: 5
section: Adminisztráció
permissions:
  - admin:access
---

## Hol találod

**Oldalsáv → Adminisztráció → Arculat** (`/admin/branding`)

## Mit tehetsz itt

- **Alkalmazásnév és cégnév** — az oldalsáv fejlécében és a böngésző címében megjelenő szöveg.
- **Logó és favicon** — a Médiatárból választható, vagy közvetlenül feltölthető kép.
- **Színek** — az alkalmazás hat színszerepe (lásd lent).
- **Bejelentkezési oldal megjelenése** — a `/login` oldal háttere és megjelenítése.

A módosítások mentés után **azonnal érvénybe lépnek** minden felhasználónál, újra-deploy vagy újraindítás nélkül.

## Színek beállítása

Hat szerepnek adhatsz színt: **Elsődleges**, **Másodlagos**, **Kiemelő**, **Siker**, **Figyelmeztetés** és **Hiba / törlés**. Minden szerephez színválasztó és színkód (`#rrggbb`) tartozik, alatta pedig élő előnézet látszik világos és sötét módban is.

A rendszer ügyel arra, hogy a gombok jelentése ne keveredjen össze:

- A **Hiba / törlés** csak piros, a **Siker** csak zöld, a **Figyelmeztetés** csak borostyán / sárgás-narancs árnyalat lehet.
- Az **Elsődleges**, **Másodlagos** és **Kiemelő** szín nem lehet piros, sárga vagy zöld (a szürkés, visszafogott árnyalatok bármilyen színben megengedettek).
- A **Másodlagos** szín nem lehet az elsődlegeshez megkülönböztethetetlenül hasonló.

Ha a szín nem illik a szerepéhez, a mező alatt piros magyarázat jelenik meg, és a mentés nem engedi tovább. A gombokon és jelvényeken a szöveg színét, valamint a sötét mód színeit a rendszer magától számolja, így mindig jól olvasható marad.

Az **Alapértelmezett színek** gomb visszaállítja a SIRONIC narancssárga alaptémáját. A színek az egész cégre érvényesek, mentés után azonnal.

## Kapcsolódó fejezetek

- [Médiatár](/help/admin-mediatar)
- [Feladat kategóriák](/help/admin-feladat-kategoriak)

_Utolsó frissítés: 2026-11_
