import { test, expect } from "@playwright/test";
import { openSeededPortfolio, SEEDED_PORTFOLIO } from "./helpers";

/**
 * Portfolio detail (read-only, v2.1.x).
 *
 * Opens the standing seeded "Sample Growth Portfolio" (12 holdings valued on
 * real market prices) from /portfolio and asserts the representative holdings,
 * KPI/returns cards and the transactions list all render. Runs authenticated
 * (shared storageState = test@investalens.dev).
 *
 * READ-ONLY: makes no mutations, so parallel workers share the seed safely.
 * Deliberately avoids the create-portfolio / add-holding / add-transaction
 * flow, which drives the live instrument-search provider (rate-limited/flaky).
 */
test.describe("portfolio detail (seeded)", () => {
  test("open the seeded portfolio and see holdings, KPIs and transactions", async ({
    page,
  }) => {
    // Cold-compile of /portfolio and the detail route can be slow on a dev
    // server, so give first-compile generous headroom.
    test.setTimeout(120000);

    await openSeededPortfolio(page);

    // --- Holdings table shows representative CURRENT holdings ---
    // A direct ASX share, an ETF, an international share and a FIIG bond all
    // appear as rows (holding codes render as links to the holding detail page).
    // Codes can appear more than once (holdings table + performers list), so
    // scope each assertion to the first match. (APT is a closed position and is
    // covered by delisted.spec.ts via the "Show closed holdings" toggle.)
    await expect(
      page.getByRole("link", { name: "BHP", exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "VAS", exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "AAPL", exact: true }).first()
    ).toBeVisible();
    // A FIIG bond (fixed-interest) holding — matched by its ISIN-style code.
    await expect(
      page.getByRole("link", { name: "AU3CB0287541", exact: true }).first()
    ).toBeVisible();

    // --- KPI cards render with values ---
    await expect(
      page.getByText("Current value", { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText("Capital gain", { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText("Total gain", { exact: true }).first()
    ).toBeVisible();

    // --- Trailing returns card renders ---
    await expect(page.getByText("Trailing returns")).toBeVisible();
    await expect(page.getByText("Max p.a.")).toBeVisible();

    // --- Transactions list shows entries ---
    await expect(
      page.getByRole("heading", { name: "Transactions" })
    ).toBeVisible();
    // The seeded portfolio has many transactions (BUYs, a SELL, dividends,
    // coupons). At least one transaction row is present in the tx table.
    const txTable = page.getByRole("table").last();
    await expect(txTable.getByRole("row").nth(1)).toBeVisible();
  });
});

test.describe("bond portfolio (seeded)", () => {
  test("the Bonds view lists the two FIIG bonds with coupon/maturity columns", async ({
    page,
  }) => {
    test.setTimeout(120000);

    const portfolioId = await openSeededPortfolio(page);

    // Portfolio → Bonds (owner-only control on the detail page header).
    await page.getByRole("link", { name: "Bonds" }).click();
    await page.waitForURL(new RegExp(`/portfolio/${portfolioId}/bonds$`));
    await expect(
      page.getByRole("heading", { name: "Bond Portfolio" })
    ).toBeVisible();

    // The bond table headers document yield/maturity/coupon-style columns.
    await expect(
      page.getByRole("columnheader", { name: "Coupon" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Maturity" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Rating" })
    ).toBeVisible();

    // Both seeded FIIG bonds appear as rows (by ISIN code and their names).
    // Each code recurs across the bond table, income payments and maturity
    // ladder, so assert on the first occurrence.
    await expect(
      page.getByText("AU3CB0287541", { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText("AU3CB0269713", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText(/AMPOL-5\.85%-30Jan34c/).first()).toBeVisible();
    await expect(page.getByText(/SGSPAU-4\.25%-15Sep28/).first()).toBeVisible();
  });
});

// Guard against a stale storageState pointing at a user without the seed.
test("the seeded portfolio is visible on /portfolio", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(
    page.getByRole("link", { name: new RegExp(SEEDED_PORTFOLIO) }).first()
  ).toBeVisible();
});
