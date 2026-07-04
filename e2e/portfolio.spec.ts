import { test, expect } from "@playwright/test";
import { searchAndSelectInstrument } from "./helpers";

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
    // Cold-compile of /portfolio/new, /add-holding and the search action plus a
    // live provider round-trip (retried) can be slow on a dev server.
    test.setTimeout(120000);

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

    // Pick the first suggestion from the listbox (search hits the live provider,
    // so allow generous time — with retries — for the async results to appear).
    await searchAndSelectInstrument(page, "BHP");

    await page.getByLabel("Type").selectOption("BUY");
    await page.getByLabel("Quantity").fill("100");
    await page.getByLabel("Price", { exact: true }).fill("40");
    // The opening-transaction submit button is labelled "Add to Portfolio".
    await page.getByRole("button", { name: "Add to Portfolio" }).click();

    // Back on the portfolio detail page with the new holding.
    await expect(page).toHaveURL(new RegExp("/portfolio/[^/]+$"));
    await expect(page.getByText("BHP").first()).toBeVisible();

    // --- Add another transaction ---
    // The inline "New transaction" form replaces the button when opened; scope
    // to it so field labels can't collide with the holdings/tx tables.
    await page.getByRole("button", { name: "New Transaction" }).click();
    const form = page.locator("form").filter({
      has: page.getByRole("heading", { name: "New transaction" }),
    });
    await expect(form).toBeVisible();

    const holdingSelect = form.getByLabel("Holding", { exact: true });
    const bhpValue = await holdingSelect
      .locator("option", { hasText: "BHP" })
      .first()
      .getAttribute("value");
    await holdingSelect.selectOption(bhpValue);
    await form.getByLabel("Type").selectOption("BUY");
    await form.getByLabel("Quantity").fill("50");
    await form.getByLabel("Price", { exact: true }).fill("42");

    const submit = form.getByRole("button", { name: "Add transaction" });
    await expect(submit).toBeEnabled();
    await submit.click();

    // The second BUY (50 units @ $42) appears in the transactions table. Wait
    // for the server action + refresh to settle.
    const txTable = page.getByRole("table").last();
    await expect(
      txTable.getByRole("row", { name: /Buy 50/ })
    ).toBeVisible({ timeout: 15000 });
  });
});
