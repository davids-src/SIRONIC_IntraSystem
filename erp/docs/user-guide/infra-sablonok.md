---
title: Stack sablonok
description: "Újrahasznosítható compose fájlok alapértelmezett környezeti változókkal, amelyekből gyorsan új stack hozható létre."
order: 6
section: Infrastruktúra
permissions:
  - infra:sablon:read
---

## Mire való

A sablon egy elmentett compose fájl alapértelmezett környezeti változókkal. Az **Új stack** űrlapon a **Kiindulás sablonból** listából kiválasztva előtölti a compose fájlt, a változókat, a típust és a leírást. Az űrlapon utána szabadon módosíthatsz mindent, mielőtt létrehozod a stacket.

## Kezelés

- **Új sablon**: név, típus, leírás, compose és alapértelmezett env (`NEV=érték` soronként). A compose-t a rendszer ellenőrzi, érvénytelen YAML vagy image nélküli service nem menthető.
- A sablon szerkesztése nem érinti a belőle korábban létrehozott stackeket.
- A sablon törlése a nevének beírásával erősíthető meg.

## Titkok

A sablon env értékei **nem titkosítottak**. Valódi jelszavakat, tokeneket ne tedd a sablonba: hagyd üresen, és a stack létrehozásakor töltsd ki.

## CLI és MCP

`sironic-infra template list|get|create|delete`, és a `stack create --template <név>` a sablonból indul (a megadott compose, env és típus felülírja a sablonét).
