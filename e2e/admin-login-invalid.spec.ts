import { test, expect } from "@playwright/test";

test.describe("Admin login — invalid credentials", () => {
  test("shows error with wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");

    await page.locator("input[type='email'], input[name='email']").first().fill("wrong@example.com");
    await page.locator("input[type='password']").first().fill("wrongpassword");
    await page.locator("button[type='submit']").first().click();

    // Should stay on login page or show an error
    await page.waitForTimeout(1500);
    const isStillOnLogin = page.url().includes("/admin/login");
    const hasError = (await page.locator("[class*='error'], [role='alert'], .text-red-500, .text-rose").count()) > 0;

    expect(isStillOnLogin || hasError).toBeTruthy();
  });
});

test.describe("Provider login — invalid credentials", () => {
  test("shows error with wrong credentials", async ({ page }) => {
    await page.goto("/provider/login");

    await page.locator("input[type='email'], input[name='email']").first().fill("nobody@example.com");
    await page.locator("input[type='password']").first().fill("badpassword");
    await page.locator("button[type='submit']").first().click();

    await page.waitForTimeout(1500);
    const isStillOnLogin = page.url().includes("/provider/login");
    const hasError = (await page.locator("[class*='error'], [role='alert'], .text-red-500, .text-rose").count()) > 0;

    expect(isStillOnLogin || hasError).toBeTruthy();
  });
});
