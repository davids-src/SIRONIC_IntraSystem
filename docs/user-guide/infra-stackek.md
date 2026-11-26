---
title: Stackek kezelése
description: "Stack létrehozása, szerkesztése, image-ek frissítése, konténer újraindítása, napló és törlés."
order: 2
section: Infrastruktúra
permissions:
  - infra:stack:read
---

## Lista

Az **Infrastruktúra → Stackek** lista a Portainer stackeket mutatja állapottal (Fut, Részben fut, Leállítva, Hibás), konténerszámmal, image-ekkel és a hozzájuk tartozó oldalak számával. Névre vagy image-re kereshetsz, típusra szűrhetsz.

## Új stack

Az **Új stack** gombbal megadod a nevet, a típust (projekt vagy szolgáltatás), opcionálisan a partnert, a compose fájlt és a környezeti változókat. A **Stack létrehozása és indítása** gomb létrehozza a stacket a Portaineren és elindítja. Egy stackben több service (image) is lehet. A konténereknek az `nginxproxy_default` hálózaton kell lenniük, hogy az NPM elérje őket. Ha vannak [sablonok](/help/infra-sablonok), a **Kiindulás sablonból** listából választva előtöltődik a compose és az env.

## Az adatlap

- **Szolgáltatások**: minden konténer rövidített image-e (a `@sha256` rész nélkül; a teljes hivatkozás egérrel a cella fölé víve látszik), állapota, portjai. Minden konténernek saját gombjai vannak:
  - **Image frissítése**: csak ennek a konténernek tölti le az image-ét, és csak akkor hozza létre újra, ha újabb van. A stack többi konténere érintetlen marad.
  - **Újraindítás**: image letöltése nélkül újraindítja.
  - **Leállítás / Indítás**: csak ezt a konténert állítja le vagy indítja el.
- **Oldalak**: a stackhez tartozó domainek. Minden oldalnál külön állítható a **partner** (belső, a stack partnere vagy bármelyik partner), így egy stackben vegyesen lehetnek belső és partneri oldalak. Az **Oldal hozzáadása** gomb az új oldal űrlapot nyitja a stack előválasztásával.
- **Compose és env**: a compose fájl és a környezeti változók szerkesztése. A mentés újratelepíti a stacket. A titkos értékek maszkolva jelennek meg; maszkolt compose nem menthető vissza.
- **Konténer napló**: a konténer utolsó sorai.
- **Adatok**: típus, partner, megjegyzés (csak a nyilvántartást érinti).
- **Előzmények**: a stacken végzett műveletek.

## Gombok

- **Image-ek frissítése**: újra letölti az image-eket és újratelepíti a stacket (a Portainer „re-pull" műveletével).
- **Indítás / Leállítás**: a stack összes konténerére.
- **Stack törlése** (Veszélyes műveletek): a stack nevének beírásával erősíted meg; a Portaineren is törli.

## Compose és környezeti változók: melyik hova?

- A **compose** (yaml) írja le a service-eket, image-eket, portokat. Az **env** a stack szintű változók listája.
- A compose-ban a `${NEV}` hivatkozás az env-ből töltődik be, tehát ha egy érték több helyen kell, vagy nem akarod a yaml-ba írni, tedd az env-be és hivatkozz rá.
- Az env **az egész stackre közös**: ha egy stackben több oldal (service) fut, mindegyik ugyanazt az env-listát látja. Ami csak egy service-nek szól, azt a compose-ban az adott service `environment:` blokkjába írd.
- Mentéskor a stack újratelepül; a maszkolt (`***MASKED***`) compose nem menthető vissza.
