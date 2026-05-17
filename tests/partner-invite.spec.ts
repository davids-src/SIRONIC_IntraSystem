import { test, expect } from "@playwright/test";

test("Új partner felvétele és portál meghívó (UI & Email flow)", async ({ page }) => {
  // 1. CRM Login (helyi környezet feltételezi, hogy a dev auth be van állítva, vagy meg kell adni jelszót)
  // Megjegyzés: Ez a teszt egyelőre csak vázlat, mert a pontos bejelentkezési adatok nem ismertek a teszthez.

  await page.goto("http://localhost:3000/login");

  // Fill in login form...
  // await page.fill('input[name="email"]', 'admin@sironic.hu');
  // await page.fill('input[name="password"]', 'password');
  // await page.click('button[type="submit"]');

  // await page.waitForURL('http://localhost:3000');

  // Navigate to new contact
  // await page.goto('http://localhost:3000/organizations/new');

  // Verify form elements exist
  // await expect(page.locator('text=Szervezet / Személy neve *')).toBeVisible();

  // Set type to individual and verify disabled fields
  // await page.click('text=Cég');
  // await page.click('text=Magánszemély');
  // const taxInput = page.locator('input[placeholder="Magánszemélynél nem alkalmazható"]').first();
  // await expect(taxInput).toBeDisabled();

  // Fill valid form
  // await page.fill('input:has-text("Szervezet / Személy neve")', 'Teszt Elek');
  // await page.fill('input:has-text("E-mail")', 'teszt@elek.hu');

  // Save
  // await page.click('button:has-text("Létrehozás")');

  // Expect Invite dialog
  // await expect(page.locator('text=Portál meghívó küldése')).toBeVisible();

  // Send invite
  // await page.click('button:has-text("Igen, meghívó küldése")');
  // await page.waitForURL(/.*\/contacts\/.*/);
});
