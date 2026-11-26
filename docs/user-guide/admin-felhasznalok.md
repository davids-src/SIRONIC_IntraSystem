---
title: Felhasználók kezelése
description: Munkatársak meghívása, fiókok szerkesztése és jelszó-visszaállítás.
order: 1
section: Adminisztráció
permissions:
  - users:read
---

## Hol találod

**Oldalsáv → Adminisztráció → Felhasználók** (`/admin/users`)

## Mit látsz

Táblázatos lista az összes felhasználóról: név, e-mail, szerepkör(ök), állapot (aktív/inaktív). A táblázat felett kereséssel, szűrőkkel és oszlopválasztóval finomíthatod a listát.

## Új munkatárs felvétele

Két módon adhatsz hozzá felhasználót:

1. **Meghívás e-mailben** (`/admin/users/invite`) — a munkatárs egy regisztrációs linket kap e-mailben, amellyel saját maga állítja be a jelszavát. A függőben lévő meghívásokat az **Meghívások** listában (`/admin/users/invitations`) követheted, és szükség esetén újraküldheted vagy visszavonhatod.
2. **Közvetlen létrehozás** (`/admin/users/new`) — azonnal létrehozod a fiókot és beállítod a kezdeti jelszót.

Mindkettőhöz **Felhasználók kezelése** (`users:write`) jogosultság szükséges.

## Munkavállalók meghívása egyszerre

Ha a munkavállalók már rögzítve vannak a HR-ben, de még nincs fiókjuk, a **Munkavállalók meghívása** gombbal (`/admin/users/munkavallalok`) egy lépésben meghívhatod őket, rögtön a megfelelő szerepkörrel. Ehhez **Felhasználók kezelése** és **E-mail küldése** jogosultság kell.

1. A listában minden jelenlegi, fiók nélküli munkavállaló szerepel a munkakörével. Kereshetsz név vagy munkakör szerint.
2. Soronként válaszd ki, **melyik címre** menjen a meghívó: céges e-mail, vagy az adatlapon rögzített magán e-mail. Akinek egyik sincs megadva, azt előbb a HR-ben kell kiegészíteni.
3. Állítsd be a **szerepköröket**. Ha egy szerepkör neve egyezik a munkakörrel (pl. „Gépkezelő”), azt a rendszer előre beírja. A **+ szerepkör** listával adhatsz hozzá, a címkére kattintva veheted el. Több embernek egyszerre: jelöld ki őket, válassz a **Szerepkör a kijelölteknek** listából, majd **Hozzáadás**.
4. Jelöld ki, kiket hívsz meg (vagy **Látható mind kijelölése**), és küldd el a meghívókat.

Az utolsó oszlop a korábbi meghívó **állapotát** is mutatja: _Elfogadásra vár_ (mikor ment ki, meddig érvényes) vagy _Meghívó lejárt_. Ha olyannak küldesz, akinek még érvényes meghívója van, az ugyanazzal a linkkel újra kimegy, az érvényessége megújul, a most választott szerepkörök pedig hozzáadódnak. Küldés után soronként látod az eredményt: elküldve, vagy a hiba oka. Amikor a munkatárs elfogadja a meghívót, a fiókja **automatikusan a HR-adatlapjához kapcsolódik**, és már a megadott szerepkörökkel indul. Szerepkör nélkül csak a Saját adataim és a Feladatok oldal érhető el számára.

## Meglévő felhasználó szerkesztése

Kattints egy sorra a részletek megnyitásához (`/admin/users/[id]`). Itt módosíthatod a nevet és a hozzárendelt szerepköröket (mindegyik mellett ott van, hány jogot ad).

Az **Egyedi többletjogok** listában azok a jogok, amelyeket valamelyik bejelölt szerepkör már megad, szürkén és pipával látszanak, „Szerepkörből: …” felirattal. Ezek csak tájékoztatásul jelennek meg, egyenként nem kell és nem is lehet bejelölni őket. Amit külön bejelölsz, az „Egyedi” címkét kap. A lista fölött az összesítés mutatja, hány jogot ad a szerepkör, és hány az egyedi többlet. A szerepkörök módosítása azonnal frissíti ezt a nézetet.

Itt inaktiválhatod is a fiókot, ha valaki már nem dolgozik a rendszerben. Az inaktiválás **azonnal** hat: aki éppen be van jelentkezve, a következő kattintásnál „A fiókod le van tiltva” oldalra kerül, és csak kijelentkezni tud. Kilépő munkavállalónál ezt a HR [kiléptetés](/help/hr-kileptetes) utolsó lépése is elvégzi.

## Jelszó-visszaállítás

Egy felhasználó sorában a **Jelszó-visszaállító e-mail küldése** gombbal jelszó-visszaállító linket küldhetsz a felhasználónak — nincs szükség arra, hogy ismerd vagy beállítsd helyette az új jelszót.

## Kapcsolódó fejezetek

- [Szerepkörök és jogosultságok](/help/admin-szerepkorok)
- [E-mail sablonok](/help/admin-email-sablonok)

_Utolsó frissítés: 2026-11_
