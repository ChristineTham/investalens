import { test, expect } from "@playwright/test";
import { openSeededPortfolio } from "./helpers";

/**
 * Accessibility & responsive navigation (v2.1.0).
 *
 * Documents the a11y improvements: a mobile hamburger that opens the nav Sheet,
 * distinct per-route <title> metadata, a skip-to-content link, and the
 * instrument search exposed as a role=combobox. Runs authenticated (shared
 * storageState).
 */

test.describe("mobile navigation", () => {
  // Force a phone-sized viewport so the md:hidden hamburger is shown, without
  // switching browser type (browser type can't be set in a describe). Best run
  // under the "Mobile Chrome" (Pixel 5) project, but this makes it robust
  // everywhere.
  test.use({ viewport: { width: 393, height: 851 } });

  test("hamburger opens the navigation Sheet on a phone viewport", async ({
    page,
  }) => {
    await page.goto("/portfolio");

    const hamburger = page.getByRole("button", { name: "Open navigation" });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // The Sheet is a dialog labelled "Navigation" containing the nav links.
    const sheet = page.getByRole("dialog", { name: "Navigation" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link").first()).toBeVisible();
  });
});

test.describe("page metadata", () => {
  // The root layout applies a "%s · InvestaLens" title template, so each route
  // gets a distinct, descriptive <title>.
  const routes: Array<{ path: string; title: RegExp }> = [
    { path: "/portfolio", title: /Portfolios · InvestaLens/ },
    { path: "/settings/labels", title: /Labels · InvestaLens/ },
    { path: "/settings/groups", title: /Custom Groups · InvestaLens/ },
    { path: "/settings/sharing", title: /Portfolio Sharing · InvestaLens/ },
    { path: "/tax/cgt", title: /Capital Gains Tax · InvestaLens/ },
    { path: "/reports/diversity", title: /Diversity Report · InvestaLens/ },
  ];

  for (const { path, title } of routes) {
    test(`${path} has a distinct <title>`, async ({ page }) => {
      // Heavy routes (e.g. /tax/cgt, /reports/*) can take a while to compile the
      // first time they're hit on a cold dev server — more than the default 60s
      // budget once navigation + rendering is included. Give first-compile room.
      test.setTimeout(120000);
      await page.goto(path, { waitUntil: "commit" });
      await expect(page).toHaveTitle(title, { timeout: 90000 });
    });
  }
});

test.describe("skip link", () => {
  test("a skip-to-content link targets the main region", async ({ page }) => {
    await page.goto("/portfolio");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toHaveAttribute("href", "#main-content");
    // The target region exists.
    await expect(page.locator("#main-content")).toBeAttached();
  });
});

test.describe("instrument search a11y", () => {
  test("instrument search exposes role=combobox", async ({ page }) => {
    // The Add Holding page renders the instrument search combobox. Navigate via
    // the seeded portfolio's detail page (no live search is triggered — we only
    // inspect the combobox's a11y attributes, never type into it).
    await openSeededPortfolio(page);
    await page.getByRole("link", { name: "Add Holding" }).click();

    const combobox = page.getByRole("combobox", { name: /search/i });
    await expect(combobox).toBeVisible();
    await expect(combobox).toHaveAttribute("aria-autocomplete", "list");
  });
});
