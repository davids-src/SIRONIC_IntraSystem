import { test, expect } from "@playwright/test";

test("Portál jelszóbeállítás és belépés", async ({ page }) => {
  // 1. Set password from invite token
  // const token = 'mock-uuid-token';
  // await page.goto(`http://localhost:3001/set-password?token=${token}`);
  // // Verify UI
  // await expect(page.locator('text=Jelszó beállítása')).toBeVisible();
  // // Fill passwords
  // await page.fill('input[type="password"]', 'secret1234');
  // await page.fill('input[placeholder="Írd be újra a jelszót"]', 'secret1234');
  // await page.click('button[type="submit"]');
  // // Expect success and redirect
  // await expect(page.locator('text=Jelszó sikeresen beállítva!')).toBeVisible();
  // await page.waitForURL('http://localhost:3001/login');
  // 2. Login
  // await page.fill('input[name="email"]', 'partner@example.com');
  // await page.fill('input[name="password"]', 'secret1234');
  // await page.click('button[type="submit"]');
  // await page.waitForURL('http://localhost:3001');
});
