import { test, expect } from "@playwright/test";

test("Ajánlat workflow és publikus PDF letöltés", async ({ page }) => {
  // 1. CRM Login
  await page.goto("http://localhost:3000/login");
  // ... login steps

  // 2. Új ajánlat létrehozása egyedi tétellel
  // await page.goto('http://localhost:3000/offers/new');
  // await page.click('button:has-text("+ Új egyedi tétel")');
  // ... fill and save item
  // ... add to offer and finalize

  // 3. Ajánlat kiküldése
  // await page.click('button:has-text("E-mail küldése")');
  // await page.click('button:has-text("Igen, küldés")');

  // 4. Publikus PDF oldal megtekintése
  // const pdfUrl = 'http://localhost:3001/public/offers/.../pdf?token=...';
  // await page.goto(pdfUrl);
  // await expect(page.locator('canvas')).toBeVisible(); // html2canvas render
});
