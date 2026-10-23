import { test, expect, Page } from "@playwright/test";

/**
 * Navigation smoke tests.
 *
 * Two failure modes to catch:
 *  1. Hard-nav crash — a page throws a JS exception on initial load.
 *  2. Soft-nav crash — a page throws when the client-side router transitions
 *     (e.g. instrumentation hooks that are undefined).
 *
 * Both modes are caught via Playwright's `pageerror` event, which fires for
 * any uncaught exception in the browser, regardless of how the page was reached.
 */

function trackErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => errors;
}

// ---------------------------------------------------------------------------
// Hard navigation (full page load via goto)
// ---------------------------------------------------------------------------

test.describe("Hard navigation — no client-side JS exceptions", () => {
  const routes = [
    "/",
    "/about",
    "/contact",
    "/specialties",
    "/patient/login",
    "/provider/login",
    "/provider/appointments",
    "/provider/calendar",
    "/provider/schedule",
    "/admin/login",
    "/labs/login",
    "/pharmacy/login",
  ];

  for (const route of routes) {
    test(`${route}`, async ({ page }) => {
      const getErrors = trackErrors(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const errors = getErrors();
      expect(
        errors,
        `Uncaught JS exception(s) on hard nav to ${route}:\n  ${errors.join("\n  ")}`
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Soft navigation (client-side routing via <Link> click)
// This is the class of bug that the onRouterTransitionStart=undefined crash
// belonged to — only triggered when the client router transitions, not on
// the initial full-page load.
// ---------------------------------------------------------------------------

test.describe("Soft navigation via <Link> — no client-side JS exceptions", () => {
  // Important notes on link selection:
  //  - Footer "About", "Contact", "Careers" etc. use target="_blank" → open new tab, useless here.
  //  - "Specialties" in the desktop nav is a <button> (dropdown), not a <Link>.
  //  - The "Home" text in the nav and footer "Find a doctor" are reliable same-page <Link>s.
  //  - Use "**/" not "/" for waitForURL — the site redirects caldoc.in → www.caldoc.in,
  //    so the absolute URL never matches a plain path string.

  test("about → home via 'Home' nav link", async ({ page }) => {
    const getErrors = trackErrors(page);
    await page.goto("/about");
    await page.waitForLoadState("networkidle");

    // The "Home" text link in the desktop nav is <Link href="/">.
    await page.locator('a[href="/"]').filter({ hasText: "Home" }).click();
    await page.waitForURL("**/", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const errors = getErrors();
    expect(
      errors,
      `Uncaught JS exception(s) after soft nav / (from /about):\n  ${errors.join("\n  ")}`
    ).toHaveLength(0);
  });

  test("specialties → find-a-doctor via footer link", async ({ page }) => {
    const getErrors = trackErrors(page);
    await page.goto("/specialties");
    await page.waitForLoadState("networkidle");

    // Footer "Find a doctor" is the only footer link without target="_blank".
    await page.locator('a[href="/providers"]').first().click();
    await page.waitForURL("**/providers**", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const errors = getErrors();
    expect(
      errors,
      `Uncaught JS exception(s) after soft nav /providers (from /specialties):\n  ${errors.join("\n  ")}`
    ).toHaveLength(0);
  });

  test("contact → home via 'Home' nav link", async ({ page }) => {
    const getErrors = trackErrors(page);
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");

    await page.locator('a[href="/"]').filter({ hasText: "Home" }).click();
    await page.waitForURL("**/", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const errors = getErrors();
    expect(
      errors,
      `Uncaught JS exception(s) after soft nav / (from /contact):\n  ${errors.join("\n  ")}`
    ).toHaveLength(0);
  });

  test("provider login → find-a-doctor via footer (covers route-transition instrumentation)", async ({ page }) => {
    const getErrors = trackErrors(page);
    // /provider/appointments redirects to /provider/login when unauthenticated —
    // the full site layout (header + footer) is still rendered, so Link clicks work.
    await page.goto("/provider/appointments");
    await page.waitForLoadState("networkidle");

    await page.locator('a[href="/providers"]').first().click();
    await page.waitForURL("**/providers**", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const errors = getErrors();
    expect(
      errors,
      `Uncaught JS exception(s) after soft nav /providers (from provider login):\n  ${errors.join("\n  ")}`
    ).toHaveLength(0);
  });
});
