import { test, expect } from "@playwright/test";

test.describe("Contact form", () => {
  test("form renders with name, message, and submit button", async ({ page }) => {
    await page.goto("/contact");

    await expect(page.locator("input[name='name'], input[placeholder*='name' i]").first()).toBeVisible();
    await expect(page.locator("textarea").first()).toBeVisible();
    await expect(page.locator("button[type='submit']").first()).toBeVisible();
  });

  test("shows validation error when name is missing", async ({ page }) => {
    await page.goto("/contact");

    // Fill message but leave name empty, then submit
    await page.locator("textarea").first().fill("I need help with something.");
    await page.locator("button[type='submit']").first().click();

    // HTML5 required validation should prevent submission and mark name invalid
    const nameInput = page.locator("input[name='name'], input[placeholder*='name' i]").first();
    const isInvalid =
      (await nameInput.evaluate((el: HTMLInputElement) => el.validity?.valid)) === false;
    expect(isInvalid).toBeTruthy();
  });

  test("shows validation error when message is missing", async ({ page }) => {
    await page.goto("/contact");

    await page.locator("input[name='name'], input[placeholder*='name' i]").first().fill("Test User");
    await page.locator("button[type='submit']").first().click();

    const messageInput = page.locator("textarea").first();
    const isInvalid =
      (await messageInput.evaluate((el: HTMLTextAreaElement) => el.validity?.valid)) === false;
    expect(isInvalid).toBeTruthy();
  });
});
