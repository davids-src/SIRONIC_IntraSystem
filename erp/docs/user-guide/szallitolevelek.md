---
title: Szállítólevelek
description: Szállítólevél felvétele, elérhetőség-ellenőrzés, kiadás a készletből, sztornó.
order: 1
section: Bizonylatok
permissions:
  - bizonylat:szallitolevel:read
---

## Hol találod

**Oldalsáv → Bizonylatok → Szállítólevelek** (`/bizonylat/szallitolevelek`)

## Mit látsz

Táblázat a szállítólevelekről: azonosító (`SZL-000042`), partner, állapot, a kiadás napja és a tételek száma. Az archivált lapok alapból rejtve vannak.

## Új szállítólevél

Az **Új szállítólevél** gombbal (**Szállítólevelek kezelése**, `bizonylat:szallitolevel:write`) válassz partnert, add meg a kiadás napját, majd keresd ki az árlistából a kiadandó termékeket és add meg a mennyiséget. A szállítólevél csak **Piszkozat** állapotban szerkeszthető.

## Elérhetőség ellenőrzése és kiadás

Az adatlapon az **Elérhetőség ellenőrzése** gomb megmutatja tételenként a kért és a szabad készletet, valamint az azonos partnerhez ugyanarra a napra felvett többi szállítólevelet (lehetséges kettős felvétel).

A **Kiadás a készletből** gombbal (`bizonylat:szallitolevel:kiad`) a szállítólevél „Kiadva” állapotba kerül és a készlet csökken. Hiányos készletnél a kiadás nem engedélyezett. A művelet többszöri megnyomása sem von le kétszer. Ha a készletlevonás hibával járt, a szállítólevél kiadva marad, és a **Készletlevonás újrapróbálása** gombbal megismételhető.

## Sztornó és archiválás

A sztornó (`bizonylat:szallitolevel:delete`) nem helyezi vissza automatikusan a kiadott készletet — azt kézi bevételezéssel kell visszavezetni. **Kiadott szállítólevél nem archiválható**, előbb sztornózni kell. Az archiváláshoz okot kell megadni; az archivált lap visszaállítható.

## Kapcsolódó fejezetek

- [Készletlista és adatlap](/help/keszlet-lista)
- [Teljesítésigazolások](/help/teljesitesigazolasok)

_Utolsó frissítés: 2026-11_
