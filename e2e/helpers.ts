import { expect, type Page } from "@playwright/test";

/**
 * Shared e2e helpers.
 *
 * The authenticated specs need a real portfolio (with a stable /portfolio/<id>
 * URL) and, for several of them, at least one holding. Rather than rely on
 * seeded data, these helpers create what they need through the UI and return
 * the ids so specs can navigate deterministically.
 */

// Matches a portfolio DETAIL url (…/portfolio/<id>) but not /portfolio,
// /portfolio/new or nested routes like …/portfolio/<id>/import.
// The negative lookahead is essential: without it the pattern also matches
// /portfolio/new, so waitForURL resolves on the un-submitted form page and the
// subsequent heading assertion fails.
const PORTFOLIO_DETAIL_URL = /\/portfolio\/(?!new(?:$|\?|\/))[a-z0-9]+(?:\?.*)?$/i;

/** The standing seeded portfolio owned by the test user. */
export const SEEDED_PORTFOLIO = "Sample Growth Portfolio";

/**
 * Credentials of the standing seeded test user. Kept here (not in
 * global-setup.ts) because Playwright forbids one test file importing another,
 * and global-setup.ts is itself a test file. Override via env to run against a
 * different seeded database.
 */
export const PRIMARY_USER = {
  email: process.env.E2E_USER_EMAIL ?? "test@investalens.dev",
  password: process.env.E2E_USER_PASSWORD ?? "investalens-test-2026",
};

/**
 * Open the seeded "Sample Growth Portfolio" from the /portfolio list and land
 * on its detail page. Returns the portfolio id parsed from the URL so callers
 * can navigate to nested routes (/bonds, /holdings/<id>, …) deterministically.
 *
 * READ-ONLY: this navigates to pre-seeded data — it never creates anything, so
 * parallel workers can share it safely.
 */
export async function openSeededPortfolio(page: Page): Promise<string> {
  await page.goto("/portfolio");
  // The /portfolio list also renders a "Consolidated View" card (href
  // /portfolio/consolidated) whose aggregate breakdown mentions each portfolio
  // by name — so match the real portfolio's own summary card by its heading,
  // excluding the consolidated card. Portfolio cards link to /portfolio/<id>.
  const card = page
    .locator('a[href^="/portfolio/"]')
    .filter({ has: page.getByRole("heading", { name: SEEDED_PORTFOLIO }) })
    .filter({ hasNot: page.getByRole("heading", { name: "Consolidated View" }) })
    .first();
  await card.click();
  await page.waitForURL(PORTFOLIO_DETAIL_URL);
  await expect(
    page.getByRole("heading", { name: SEEDED_PORTFOLIO })
  ).toBeVisible();
  return page.url().split("/").pop()!.split("?")[0];
}

/**
 * Return the id of a portfolio the E2E user owns. Existing cards on /portfolio
 * may include portfolios shared TO this user (which reject owner-only mutations
 * like Add Holding / Import with "Portfolio not found"), and stale rows from
 * earlier runs, so we always create a fresh, guaranteed-owned portfolio through
 * the UI. Unique names avoid collisions across reruns.
 */
export async function ensurePortfolioId(page: Page): Promise<string> {
  return createPortfolio(
    page,
    `E2E Portfolio ${Date.now()}-${Math.floor(Math.random() * 1e4)}`
  );
}

/** Create a portfolio through the New Portfolio form; returns its id. */
export async function createPortfolio(page: Page, name: string): Promise<string> {
  await page.goto("/portfolio/new");
  await page.getByLabel("Portfolio Name").fill(name);
  await page.getByLabel("Tax Residency").selectOption("AU");

  // The Create action calls redirect() server-side. On a cold dev server the
  // very first submission can surface the redirect as a caught "NEXT_REDIRECT"
  // error in the client's try/catch (shown as an inline alert) instead of
  // navigating, and the form re-enables. Click, then retry once if we're still
  // on /portfolio/new — the warm second attempt redirects cleanly. (A duplicate
  // portfolio is harmless in the test DB; we use the one we land on.)
  const create = page.getByRole("button", { name: /create portfolio/i });
  for (let attempt = 0; attempt < 3; attempt++) {
    await create.click();
    const landed = await page
      .waitForURL(PORTFOLIO_DETAIL_URL, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (landed) break;
    // Still on /portfolio/new: wait for the button to re-enable before retry.
    await expect(create).toBeEnabled();
  }

  // Lands on the new portfolio's detail page: /portfolio/<id>.
  await page.waitForURL(PORTFOLIO_DETAIL_URL);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return page.url().split("/").pop() as string;
}

/**
 * Type a code into the instrument-search combobox and click the first result.
 *
 * The search debounces (300ms) then calls a server action that hits the live
 * market-data provider. On a cold dev server the first request also pays the
 * action's compile cost, and the provider itself can be slow/transient, so the
 * result listbox occasionally never populates on the first keystroke. Re-trigger
 * the debounced search a few times (clear + retype) before giving up so a single
 * slow provider response doesn't fail the test.
 */
export async function searchAndSelectInstrument(
  page: Page,
  code: string
): Promise<void> {
  const search = page.getByRole("combobox", { name: /search/i });
  const firstOption = page.getByRole("option").first();

  for (let attempt = 0; attempt < 4; attempt++) {
    await search.fill("");
    await search.fill(code);
    const appeared = await firstOption
      .waitFor({ state: "visible", timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (appeared) break;
    if (attempt === 3) {
      // Final wait so the assertion below surfaces a clear timeout on failure.
      await firstOption.waitFor({ state: "visible", timeout: 20000 });
    }
  }
  await firstOption.click();
}

/**
 * Ensure the given portfolio has at least one holding by adding a BHP BUY
 * through the Add Holding page. Idempotent-ish: if a holding already exists it
 * still adds one (unique data is fine in the test DB). Returns after landing
 * back on the portfolio detail page.
 */
export async function addHolding(
  page: Page,
  portfolioId: string,
  { code = "BHP", quantity = "100", price = "40" } = {}
): Promise<void> {
  await page.goto(`/portfolio/${portfolioId}/add-holding`);
  await expect(page.getByRole("heading", { name: "Add Holding" })).toBeVisible();

  await searchAndSelectInstrument(page, code);

  await page.getByLabel("Type").selectOption("BUY");
  await page.getByLabel("Quantity").fill(quantity);
  await page.getByLabel("Price", { exact: true }).fill(price);
  await page.getByRole("button", { name: "Add to Portfolio" }).click();

  await page.waitForURL(new RegExp(`/portfolio/${portfolioId}$`));
}
