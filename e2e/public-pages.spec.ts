import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads and shows key content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CalDoc|caldoc/i);
    // Main heading should be visible
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("contact page loads and shows the form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form, [role='form']").first()).toBeVisible();
  });

  test("specialties page loads", async ({ page }) => {
    await page.goto("/specialties");
    await expect(page).toHaveURL(/specialties/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
