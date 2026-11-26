---
title: Webhelyek és belépések (WordPress, FTP)
description: "Nem stackes oldalak nyilvántartása, partnerhez rendelése és a belépések (FTP, SFTP, WordPress admin) titkosított tárolása."
order: 5
section: Infrastruktúra
permissions:
  - infra:webhely:read
---

## Mire való

A **Webhelyek** menü azokat az oldalakat követi, amelyek **nem** a saját Portaineren futnak: WordPress oldalakat és FTP-s webtárhelyen lévő oldalakat. Egy helyen látszik, melyik partneré, hol van tárhelyen, mikor jár le, és ott vannak a belépései is, így nem kell levelekből visszakeresni és másolgatni őket.

## Webhely felvétele

Az **Új webhely** űrlapon megadod a megnevezést, a típust (WordPress, FTP-s webtárhely, Egyéb), a hostneveket (az első a fő cím), a partnert, a tárhely szolgáltatóját és a lejáratot. Partner nélkül a webhely **belső**. A hostnév nem lehet ugyanaz, mint egy stackes oldalé vagy másik webhelyé.

## Állapot

Az **Állapot ellenőrzése** gomb csak olvas: megnyitja a webhelyet HTTPS-en, és megnézi, hogy a `/wp-json` WordPress-ként válaszol-e. Nem lép be sehova. Az eredmény az adatlapon és a listában is látszik.

## Belépések

Az adatlap **Belépések** blokkjában vehetsz fel belépést típussal (FTP, SFTP, FTPS, WordPress admin, tárhely vezérlőpult, egyéb), hosttal, porttal, felhasználóval, jelszóval, könyvtárral és URL-lel.

- A jelszó **titkosítva** tárolódik, a képernyőn soha nem jelenik meg.
- **Host másolása**, **Felhasználó másolása**: a vágólapra teszi az értéket.
- **Jelszó másolása**: a vágólapra teszi a jelszót. Ehhez külön jog kell („Hozzáférés jelszavának megtekintése"), és **minden megtekintés naplózódik** (ki, mikor, melyik belépés; az érték nem).
- **Kapcsolat próba**: megnézi, hogy a host portja elérhető-e. Nem lép be.
- Szerkesztésnél a jelszó mezőt üresen hagyva a mentett jelszó marad.

## Törlés

A webhely törlése a nyilvántartásból törli a webhelyet **és az összes hozzá tartozó belépést**. A tényleges oldalhoz nem nyúl. A webhely nevének beírásával kell megerősíteni.

## Jogosultságok

Webhelyek olvasása, kezelése, törlése; hozzáférések olvasása (jelszó nélkül), kezelése; jelszó megtekintése. Az infra-operator szerepkör a jelszó megtekintését nem tartalmazza, az infra-admin igen.
