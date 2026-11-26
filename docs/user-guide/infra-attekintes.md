---
title: Infrastruktúra áttekintés
description: "A saját szerverek egy helyen: stackek, konténerek, oldalak, SSL tanúsítványok és a szinkron."
order: 1
section: Infrastruktúra
permissions:
  - infra:stack:read
---

## Mire való

Az **Infrastruktúra** menü egy helyen mutatja a saját üzemeltetésű szolgáltatásokat: a Portainer stackeket, az oldalakat (domainek) és az SSL tanúsítványokat. A rendszer nem tárol külön „igazságot": a Portainer, az Nginx Proxy Manager (NPM) és a Cloudflare adatait olvassa.

## Fogalmak

- **Stack**: egy Portainer stack, vagyis egy projekt vagy szolgáltatás összes image-e (konténere) együtt.
- **Oldal**: egy domain (és aliasai), amely egy stack egy szolgáltatására mutat. Egy stackhez több oldal is tartozhat.
- **Integráció**: a Portainer, NPM és Cloudflare kapcsolata.

## Az áttekintés oldal

- Számlálók: stackek, konténerek, oldalak, SSL tanúsítványok.
- **Figyelmet igénylő konténerek**: leállt vagy újraindulgató konténerek.
- **SSL tanúsítványok**: a lejárt vagy hamarosan lejáró tanúsítványok.
- **Stackhez nem tartozó konténerek**: pl. maga a Portainer.
- **Legutóbbi műveletek**: ki mit csinált.

## Szinkron

A **Szinkron** gomb beolvassa a Portainer stackeket és az NPM proxy hostokat, és összekapcsolja őket a konténer neve alapján. Új stack vagy oldal felvétele előtt, vagy ha kívülről (pl. Portaineren) módosítottál valamit, futtasd le. Csak „Stack műveletek" joggal érhető el.

## Jogosultságok

Az áttekintés a „stack olvasása" joggal látható. A szerepkörök: infra-viewer (olvasás), infra-operator (műveletek), infra-admin (minden, törlés is).
