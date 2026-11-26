---
title: Integrációk
description: "Portainer, Nginx Proxy Manager és Cloudflare kapcsolatok titkosított hitelesítéssel és teszt gombbal."
order: 4
section: Infrastruktúra
permissions:
  - infra:integracio:read
---

## Mire való

Az **Infrastruktúra → Integrációk** oldalon vehető fel és tesztelhető a Portainer (stackek), az NPM (proxy, SSL) és a Cloudflare (DNS) kapcsolat. A hitelesítő adatok titkosítva tárolódnak, a felületen és a naplóban soha nem jelennek meg.

## Teendők

- **+ Portainer / NPM / Cloudflare**: új kapcsolat felvétele (cím és hitelesítő adatok).
- **Teszt**: kipróbálja a kapcsolatot; az eredmény a kártyán marad.
- Szerkesztésnél üresen hagyott titkos mező a régi értéket tartja meg.
