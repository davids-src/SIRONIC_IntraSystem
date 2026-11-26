---
title: Oldalak, domainek és SSL
description: "Oldal létrehozása egy lépésben (DNS, SSL DNS-01, proxy), ellenőrzés, SSL megújítás és törlés."
order: 3
section: Infrastruktúra
permissions:
  - infra:oldal:read
---

## Mi az oldal

Az oldal egy domain (és aliasai), amely egy stack egy szolgáltatására (konténer + port) mutat. Egy stackben több oldal is futhat különböző domainekkel. Partnerhez oldalanként rendelhető, vagy a stack partnerétől örökli. Egy stackben így lehetnek belső és különböző partnerek oldalai is. WordPress és FTP-s oldalakhoz lásd a [Webhelyek](/help/infra-webhelyek) cikket.

## Új oldal

Az **Új oldal** űrlapon kiválasztod a stacket és a szolgáltatást, megadod a portot, a hostneveket és a DNS beállításokat. A mentés egy lépésben, sorrendben elvégzi:

1. DNS rekord a Cloudflare-ben,
2. SSL tanúsítvány: ha van lefedő meglévő, azt használja, különben újat állít ki Let's Encrypttel **DNS-01** (Cloudflare) kihívással, nyitott 80-as port nélkül,
3. NPM proxy host.

A lépések eredménye az űrlap alatt látható. A folyamat újrafuttatható, a már kész lépéseket nem duplikálja.

## Az adatlap

- **Állapot ellenőrzése**: csak olvas; DNS, proxy, SSL érvényesség, konténer állapot, elérhetőség.
- **Beállítások**: hostnevek, cél stack/szolgáltatás/port, séma, websocket, HTTPS átirányítás, partner. Hostnév módosítása újra beállítja a DNS-t és az SSL-t.
- **SSL megújítása most**: azonnal megújítja a tanúsítványt az NPM-ben.
- **Oldal törlése**: a fő hostnév beírásával; törli az NPM proxy hostot, opcionálisan a DNS rekordokat is. A tanúsítvány megmarad.
