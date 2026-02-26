import { test, expect } from "@playwright/test";

/**
 * Auth tests.
 * Verifies that protected routes handle unauthenticated access correctly and
 * that login pages render the expected form elements.
 */

test.describe("Protected routes — unauthenticated access", () => {
  test("patient portal shows sign-in prompt when no session", async ({ page }) => {
    await page.goto("/patient/appointments");
    // Page renders but shows a link to sign in (no hard redirect on this route)
    await expect(page.locator("a[href*='/patient/login']").first()).toBeVisible();
  });

  test("admin portal redirects to admin login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("provider portal renders without crashing when unauthenticated", async ({ page }) => {
    await page.goto("/provider/appointments");
    // Provider appointments page renders (per-operation auth checks)
    await expect(page.locator("body")).toBeVisible();
  });

  test("labs portal redirects to labs login", async ({ page }) => {
    await page.goto("/labs");
    await expect(page).toHaveURL(/\/labs\/login/);
  });

  test("pharmacy portal redirects to pharmacy login", async ({ page }) => {
    await page.goto("/pharmacy");
    await expect(page).toHaveURL(/\/pharmacy\/login/);
  });

  test("NGO portal redirects to NGO login", async ({ page }) => {
    await page.goto("/ngo");
    await expect(page).toHaveURL(/\/ngo\/login/);
  });
});

test.describe("Login pages render correctly", () => {
  test("patient login page has phone input", async ({ page }) => {
    await page.goto("/patient/login");
    const input = page.locator("input[type='tel'], input[type='text'], input[name*='phone']").first();
    await expect(input).toBeVisible();
  });

  test("admin login page has email and password inputs", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("provider login page has email and password inputs", async ({ page }) => {
    await page.goto("/provider/login");
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("labs login page has email input", async ({ page }) => {
    await page.goto("/labs/login");
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
  });
});
