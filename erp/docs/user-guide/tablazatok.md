---
title: Listák és táblázatok használata
description: Keresés, szűrés, rendezés, oszlopok és oldalméret — és mi marad meg belőlük a következő megnyitásig.
order: 2
section: Áttekintés
---

## Hol találod

Minden lista-nézetben, az egész rendszerben ugyanígy működik — például **Gépészet → Gépek**
(`/gepeszet/gepek`), **Gépészet → Kisértékű eszközök**, **Vállalkozás → Szerződések**,
**Termelés → Munkák**, a Gépüzem listái (**Gépüzemnapló**, **Tankolások**, **Fogyasztásfigyelő**) és a HR listái (**Munkaidő**, **Bérek**, **Igények**, **Szabadság**).

Ahol egy oldalon több lista van (pl. Munkaidő, Fogyasztásfigyelő), azok **fülekre** oszlanak, és mindig az éppen nyitott fül listáját szűröd. Néhány listában a sorra kattintva **oldalpanel** nyílik a részletekkel és a teendőkkel (pl. egy fogyasztási riasztás vagy egy igény kezelése).

## Mit látsz

A táblázat felett egy eszközsor: **keresőmező**, **Szűrők**, **Rendezés**, **Oszlopok**, a
táblázat alatt pedig az oldalváltó, a találatok száma és az **Oldalanként** választó.

A bekapcsolt szűrések, a keresés és a rendezés kis „címkékként" is megjelennek a táblázat felett
— a címkére kattintva az adott beállítás egyből kikapcsolható, a **Törlés** gomb pedig egyszerre
mindet kiszedi.

## Keresés és szűrés

- A **kereső** a lista fontosabb szöveges mezőiben keres (pl. a Gépek listán a rendszámban és a
  típusban).
- A **Szűrők** panelben mezőnként adhatsz meg értéket. Ahol a mező értékei ismertek (státusz, típus, gyártó, helyszín, felelős, besorolás…), ott **jelölőnégyzetes lista** áll rendelkezésre — több érték is kipipálható, gépelni nem kell. Igen/nem mezőknél legördülő, számnál minimum/maximum, dátumnál _-tól / -ig_ tartomány, és csak a szabad szöveges mezőknél (pl. leltári szám) gépelhető részleges egyezés.
- A kipipálós szűrőknél a kiválasztott értékek **jelölőként** (kis címkeként, **×**-szel) jelennek meg a mező felett — egy kattintással levehetők —, hosszabb listánál pedig a **keresőmezővel** gyorsan megtalálható az érték (pl. egy gyártó vagy helyszín), Enterrel pedig az egyetlen találat kiválasztható. Az _Igen / Nem_ mezők háromállású kapcsolók (Mind – Igen – Nem).
- A beállított szűrők a táblázat felett **címkékként** látszanak (pl. _Státusz: Aktív, Szervizben_); egy címkére kattintva az adott szűrő megszűnik.
- Az állapotot jelző oszlopok (státusz, dokumentum-állapot, besorolás, készlet) **színes jelölőként** jelennek meg: zöld = rendben, sárga = figyelmet kér, piros = sürgős, kék = tájékoztató, szürke = semleges.

## Visszalépés egy elemről — a szűrés megmarad

Ha egy szűrt, keresett vagy rendezett listából megnyitsz egy elemet (pl. egy gépet vagy egy
kisértékű eszközt), majd visszalépsz, a lista **ugyanúgy jön vissza, ahogy hagytad**: ugyanazok
a szűrők, ugyanaz a keresés, rendezés, oldal — és ugyanoda görget, ahol voltál. Ez működik

- a böngésző **Vissza** gombjával,
- az adatlap tetején lévő **„Vissza a …-hoz”** linkkel,
- a felső **morzsamenüvel** (pl. _Gépészet › Gépek_), és
- ha az oldalsávból nyitod meg újra ugyanazt a listát.

A lista ezt a böngészőlapon belül jegyzi meg; új lapon vagy a böngésző bezárása után a lista
alaphelyzetben (az elmentett rendezéssel és oldalmérettel) nyílik. Ha az alaphelyzetet szeretnéd,
kattints a **Törlés** gombra — onnantól a lista szűrés nélkül nyílik meg.

## Rendezés — és hogy megmarad-e

A rendezést kétféleképpen állíthatod:

- rákattintasz egy **oszlopfejlécre** (újabb kattintás megfordítja a sorrendet), vagy
- a **Rendezés** panelben választasz mezőt és irányt (↑ A–Z, ↓ Z–A).

A kiválasztott rendezést a rendszer **megjegyzi**: ha elnavigálsz a listáról (pl. megnyitsz egy
gépet, majd visszajössz), vagy később újra megnyitod az oldalt, ugyanabban a sorrendben kapod
vissza. Addig marad érvényben, amíg
**más rendezést nem választasz**, vagy a rendezés címkéjére (illetve a **Törlés** gombra)
kattintva nem szeded ki.

A megjegyzés **listánként külön** történik, és ahhoz a böngészőhöz/eszközhöz tartozik, amin
beállítottad — egy másik gépen vagy másik böngészőben a saját beállításod él.

## Oldalméret — az összes elem egy lapon

A táblázat alatti **Oldalanként** választóval állítható, hogy egyszerre hány sor jelenjen meg:
**10, 25, 50, 100 vagy 250**. Ha mindent egymás után szeretnél látni, válaszd a tételszámnál
nagyobb értéket (pl. 250) — a választó melletti szöveg mindig kiírja, összesen hány tétel van.

Az oldalméret ugyanúgy megjegyzésre kerül, mint a rendezés: a következő megnyitáskor is az
utoljára választott méret lesz érvényben.

## Rögzített fejléc és problémás sorok

Hosszú listán görgetéskor az **oszlopfejléc a tetején marad**, így mindig látod, melyik oszlop mit jelent. Ha egy sorral gond van (lejárt vagy hiányzó dokumentum, hiányzó besorolás, alacsony készlet, alkatrészre váró szervizjegy), az érintett **cellában ikon** jelenik meg: sárga háromszög = figyelmeztetés, piros kör = hiba, a sor pedig halványan színezett. Az ikonra víve (vagy billentyűzettel ráfókuszálva) felugró szöveg magyarázza el a pontos okot — a cellákba nem kell külön kiírni, hogy „nincs”. Ha az érintett oszlop épp rejtve van, az ikon a sor első cellájában látszik.

## Oszlopok

Az **Oszlopok** panelben kapcsolhatók be/ki az egyes mezők, az **Összes megjelenítése** és az
**Alapértelmezés** gombbal pedig egy kattintással visszaállítható egy teljes, illetve a gyári
oszlopkészlet. Ez a választás is böngészőnként, listánként megmarad.

## Megosztható link

A keresés, a szűrés, a rendezés és az oldalméret a böngésző címsorában is megjelenik, így egy
beállított listát ki tudsz másolni és elküldeni — aki megnyitja, ugyanazt a nézetet látja
(feltéve, hogy van rá jogosultsága).

## Kapcsolódó fejezetek

- [Áttekintés és első lépések](/help/index)
- [Exportálás és nyomtatás](/help/exportalas-nyomtatas)
- [Gépek kezelése](/help/gepeszet-gepek)
- [Fiókod és jogosultságaid](/help/fiok)

_Utolsó frissítés: 2026-11_
