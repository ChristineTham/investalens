import { test, expect } from "@playwright/test";
import { openSeededPortfolio } from "./helpers";

/**
 * Cash accounts (read-only, v2.1.x).
 *
 * The seed links a real "CommSec Cash Account" (physical, the default
 * settlement account, balance ~$48,761, 7 transactions) to the "Sample Growth
 * Portfolio". This spec asserts the account on /accounts and confirms the
 * portfolio detail's "Linked accounts" panel shows it as the default. All
 * READ-ONLY. Runs authenticated (shared storageState = test@investalens.dev).
 */
test.describe("cash accounts (seeded)", () => {
  test("/accounts shows the CommSec Cash Account with a balance and transactions", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.goto("/accounts");
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();

    // The seeded account card renders with its name.
    const card = page
      .getByRole("link")
      .filter({ hasText: "CommSec Cash Account" })
      .first();
    await expect(card).toBeVisible();

    // The card shows a balance and a non-zero transaction count.
    await expect(card.getByText("Balance")).toBeVisible();
    await expect(card.getByText(/\d+ transactions?/)).toBeVisible();

    // Open the account to confirm its transaction ledger renders.
    await card.click();
    await page.waitForURL(/\/accounts\/[a-z0-9]+/i);
    await expect(
      page.getByRole("heading", { name: /CommSec Cash Account/ })
    ).toBeVisible();
    await expect(page.getByText("Current balance")).toBeVisible();
  });

  test("the portfolio's Linked accounts panel shows it as the default settlement account", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await openSeededPortfolio(page);

    // The "Linked accounts" panel (owner-only) lists the linked real account
    // with a "Default" badge marking it as the default settlement account.
    const panel = page
      .locator("div.rounded-lg")
      .filter({ has: page.getByRole("heading", { name: "Linked accounts" }) })
      .first();
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("link", { name: "CommSec Cash Account" })
    ).toBeVisible();
    await expect(panel.getByText("Default", { exact: true })).toBeVisible();
  });
});
