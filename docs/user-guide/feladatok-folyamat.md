---
title: Feladat-folyamat — lépések egymás után
description: Több ember egymás utáni munkája egy feladaton — lépésenként egy felelős, a következő automatikusan kapja meg; folyamat indítása vagy hozzáadása meglévő feladathoz, lépések szerkesztése menet közben, átosztás, megszakítás, sablonok; a haladás profilképekkel és százalékkal, ugyanúgy, mint a szerződéseknél és ajánlatkéréseknél.
order: 5.7
section: Áttekintés
---

## Hol találod

**Oldalsáv → Általános → Feladatok**:

- **Új folyamat** — `/feladatok/folyamat/uj` („Új feladat lépésekkel”).
- **Meglévő feladatból** — a saját magad által kiadott, nyitott, egyéni feladat adatlapján a **Folyamat hozzáadása** gombbal.
- **Egy folyamat oldala** — `/feladatok/folyamat/<azonosító>`, a lépések feladatairól a „Feladat-folyamat” panel címére kattintva, vagy a **Követett folyamatok** nézetből.

## Mire való?

Ha egy munkán többen dolgoznak **egymás után** — például előbb Anna bekéri az árajánlatokat, utána Bence jóváhagyja, végül Csilla megrendeli —, akkor ne három külön feladatot adj ki, hanem egy folyamatot három lépéssel:

- Minden lépésnek **egy felelőse** van, és a lépés neki egy rendes feladat a Teendőimben.
- Az **1. lépés** felelőse azonnal megkapja a feladatot.
- Amikor késznek jelöli, a **következő lépés felelőse** automatikusan megkapja a sajátját (asztali értesítést is kap).
- Ha az utolsó lépés is kész, a folyamat **kész**, és erről te — az indító — értesítést kapsz.

Ha egy lépésen belül többen dolgoznak **egyszerre**, arra továbbra is a [csoportos feladat](/help/feladatok-csoportos) való.

## Folyamat indítása

1. **Mi a feladat?** — megnevezés, leírás (minden lépés felelőse látja), a folyamat **határideje**, kategória, prioritás.
2. **Lépések** — soronként: a lépés neve, a felelős (kolléga neve), opcionálisan a lépés saját határideje. A nyilakkal sorrendet cserélsz, a kukával törölsz, a **Lépés hozzáadása** gombbal új sort veszel fel. Ha egy lépésnek nincs saját határideje, a folyamat határideje érvényes rá.
3. **Folyamat indítása** — a folyamat oldalára jutsz, az 1. lépés felelőse már meg is kapta a feladatot.

**Meglévő feladatból:** a feladat adatlapján a **Folyamat hozzáadása** gomb ugyanezt az űrlapot nyitja, de az 1. lépés maga a meglévő feladat (a felelőse nem változik). Te csak a további lépéseket adod meg. A gomb csak a saját magad által kiadott, nyitott, egyéni feladatnál látszik, amely még nem tartozik folyamathoz vagy más modulhoz.

## Sablonok

Gyakran ismétlődő lépéssorhoz:

- **Mentés sablonként** — a lépéssort névvel elmented. A **Mindenki használhatja** jelöléssel a kollégáid is látják, enélkül csak te. Azonos névvel mentve felülírod a régit.
- **Sablon betöltése** — a választóból egy sablon lépéseit tölti be (a felelősök és a határidők is, ha a sablonban szerepelnek; a határidőt a mai naptól számolja). Betöltés után bármit átírhatsz.

## A folyamat oldala

- **Fejléc** — állapot (Folyamatban / Kész / Megszakítva), prioritás, kategória, ki indította, határidő.
- **Most** — melyik lépés fut és kinél; mellette minden résztvevő profilképe.
- **Haladás** — sáv és „2/4 lépés · 50%”.
- **Lépések útja** — minden lépés sorban: sorszám (a késznél pipa), név, állapot, felelős profilképpel, határidő, link a lépés feladatára. Az éppen futó lépés kiemelt („most”), a lejártak pirosak, az elutasított lépésnél az indok is látszik.

A folyamatot látja az indító, minden lépés felelőse (a későbbieké is, előre), és akinek a feladatok kimutatásához van joga.

## Ha te indítottad: kezelés menet közben

- **Lépések szerkesztése** — a még el nem indult lépéseket bármikor módosíthatod: új lépés, törlés, sorrend, felelős, név, határidő. Az elindult (futó vagy kész) lépések zárolva vannak. Ha egy kész folyamathoz adsz új lépést, a folyamat folytatódik, és az új lépés azonnal elindul.
- **Lépés átosztása** — a futó (vagy elutasított) lépést másnak adhatod, opcionális megjegyzéssel. A régi felelős feladata „továbbadva” lesz, az új felelős megkapja.
- **Lépés újraindítása** — ha egy lépés feladatát visszavontad, a lépés megáll („Megszakítva”). Itt újraindíthatod ugyanannak vagy másnak.
- **Folyamat megszakítása** — megerősítés után a futó lépés feladatát visszavonjuk, a további lépések nem indulnak el.

## Ha egy lépés a tiéd

A lépés neked egy rendes feladat: elfogadod, dolgozol rajta, és a **Mi a teendő?** panelen késznek jelölöd — ezzel indul a következő lépés. Az adatlapon a **Feladat-folyamat** panel mutatja az egész utat: ki volt előtted, ki jön utánad, és melyik lépés a tiéd („← ez a feladat”).

- **Elutasítás** — ha nem tudod vállalni, utasítsd el indokkal. A folyamat ilyenkor megáll, és megvárja, amíg az indító másnak adja (a Feladatokban újrakiadja, vagy a folyamat oldalán átosztja).
- **Továbbadás** — ha továbbadod, a lépés az új felelősnél folytatódik.

A feladat adatlapján a **Saját részlépések** lista a te saját teendőlistád ehhez a feladathoz. Ez nem a folyamat része, a többiek lépéseit a folyamat útja mutatja.

## Haladás a Feladatok listában

A Feladatok táblázat **Haladás** oszlopa egy pillantással mutatja, hol tart egy munka:

- **Folyamat lépése** (feladat-folyamat, szerződés, ajánlatkérés) — a résztvevők profilképe, „2/4 · Kovács Diána” (hányadik lépésnél és kinél tart), és egy százalékos sáv.
- **Csoportos feladat** — a résztvevők profilképe és „3/5 kész”.
- **Egyéni feladat részlépésekkel** — „2/4 részlépés”.

Az oszlop szerint rendezni is lehet, és az Excel-exportban is benne van.

## Szerződések és ajánlatkérések

A szerződések szakaszai és az ajánlatkérések szakaszai ugyanígy működnek: lépésenként egy felelős, a lépések kapcsolt feladatok, a következő akkor indul, amikor az előző kész. Ugyanaz a lépésút látszik profilképekkel és haladással a szerződés és az ajánlatkérés oldalán, valamint a lépések feladatain. Lásd [Szerződések](/help/vallalkozas-szerzodesek) és [Ajánlatkérések](/help/vallalkozas-ajanlatkeresek).

## Kapcsolódó fejezetek

- [Feladatok — teendőim, saját és csoportos feladatok](/help/feladatok)
- [Feladat adatlapja](/help/feladatok-adatlap)
- [Csoportos feladatok kezelése](/help/feladatok-csoportos)
- [Listák és táblázatok használata](/help/tablazatok)

_Utolsó frissítés: 2026-11_
