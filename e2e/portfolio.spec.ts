import { test, expect } from "@playwright/test";

/**
 * Portfolio lifecycle (v2.1.0): create a portfolio, add a holding with an
 * opening transaction, add a further transaction, and confirm it appears in the
 * transactions table. Runs authenticated (shared storageState).
 *
 * The instrument search hits the live market-data provider, so a network path
 * to that provider is required for the holding step.
 */
test.describe("portfolio management", () => {
  const portfolioName = `E2E Portfolio ${Date.now()}`;

  test("create a portfolio, add a holding, add a transaction", async ({
    page,
  }) => {
    // --- Create portfolio ---
    await page.goto("/portfolio");
    await page.getByRole("link", { name: "New Portfolio" }).first().click();
    await expect(page).toHaveURL(/\/portfolio\/new/);

    await page.getByLabel("Portfolio Name").fill(portfolioName);
    await page.getByLabel("Tax Residency").selectOption("AU");
    await page.getByRole("button", { name: /create portfolio/i }).click();

    // Land on the new portfolio's detail page.
    await expect(
      page.getByRole("heading", { name: portfolioName })
    ).toBeVisible();

    // --- Add a holding via instrument search ---
    await page.getByRole("link", { name: "Add Holding" }).click();
    await expect(
      page.getByRole("heading", { name: "Add Holding" })
    ).toBeVisible();

    const search = page.getByRole("combobox", { name: /search/i });
    await search.fill("BHP");
    // Pick the first suggestion from the listbox.
    const firstOption = page.getByRole("option").first();
    await firstOption.waitFor({ state: "visible" });
    await firstOption.click();

    await page.getByLabel("Type").selectOption("BUY");
    await page.getByLabel(/quantity/i).fill("100");
    await page.getByLabel(/price/i).fill("40");
    await page.getByRole("button", { name: /add holding/i }).click();

    // Back on the portfolio detail page with the new holding.
    await expect(page).toHaveURL(new RegExp("/portfolio/[^/]+$"));
    await expect(page.getByText("BHP").first()).toBeVisible();

    // --- Add another transaction ---
    await page.getByRole("button", { name: "New Transaction" }).click();
    const holdingSelect = page.getByLabel("Holding");
    await holdingSelect.selectOption(
      await holdingSelect.locator("option", { hasText: "BHP" }).first().getAttribute("value")
    );
    await page.getByLabel("Type").selectOption("BUY");
    await page.getByLabel(/quantity/i).fill("50");
    await page.getByLabel(/price/i).fill("42");
    await page.getByRole("button", { name: /add transaction/i }).click();

    // The transactions table shows at least the two BUYs we entered.
    const txTable = page.getByRole("table").last();
    await expect(txTable.getByText("BHP").first()).toBeVisible();
    await expect(txTable.getByText("50")).toBeVisible();
  });
});
