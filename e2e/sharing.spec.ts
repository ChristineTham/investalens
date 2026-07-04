import { test, expect } from "@playwright/test";
import { createPortfolio } from "./helpers";

/**
 * Read-only portfolio sharing (v2.1.0).
 *
 * The primary (authenticated) user creates a portfolio and shares it read-only
 * with a second user's email. That second user, in a fresh browser context,
 * sees the portfolio with a "Shared" badge and NO mutation controls
 * (Edit / Import / Add Holding / New Transaction).
 */
test.describe("portfolio sharing", () => {
  const sharedPortfolioName = `E2E Shared ${Date.now()}`;
  const secondUser = {
    name: "E2E Recipient",
    email: `e2e.recipient.${Date.now()}@investalens.test`,
    password: "e2e-Password-123",
  };

  test("share read-only; recipient sees a Shared badge and no mutation controls", async ({
    page,
    browser,
  }) => {
    // --- As the primary user: create a portfolio to share ---
    await createPortfolio(page, sharedPortfolioName);

    // --- Register the second user in an isolated context first ---
    const recipientContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const recipientPage = await recipientContext.newPage();
    await recipientPage.goto("/register");
    await recipientPage.getByLabel("Name").fill(secondUser.name);
    await recipientPage.getByLabel("Email").fill(secondUser.email);
    await recipientPage
      .getByLabel("Password", { exact: true })
      .fill(secondUser.password);
    await recipientPage.getByLabel("Confirm Password").fill(secondUser.password);
    await recipientPage.getByRole("button", { name: "Create account" }).click();
    await expect(recipientPage).toHaveURL(/\/portfolio/);

    // --- As the primary user: share read-only to the recipient's email ---
    await page.goto("/settings/sharing");
    await page
      .getByLabel("Portfolio to share")
      .selectOption({ label: sharedPortfolioName });
    await page.getByLabel("Email address").fill(secondUser.email);
    await page.getByLabel("Access level").selectOption("read");
    // Exact match so this doesn't also resolve the "Remove share" buttons that
    // accumulate from earlier runs.
    await page.getByRole("button", { name: "Share", exact: true }).click();

    // Confirm the share is listed under "Shared by you".
    await expect(page.getByText(secondUser.email)).toBeVisible();

    // --- As the recipient: open the shared portfolio ---
    await recipientPage.goto("/settings/sharing");
    await expect(
      recipientPage.getByRole("heading", { name: "Shared with you" })
    ).toBeVisible();
    await expect(recipientPage.getByText(sharedPortfolioName)).toBeVisible();

    // Navigate to the portfolio itself (via the portfolios list card).
    await recipientPage.goto("/portfolio");
    await recipientPage
      .getByRole("link", { name: new RegExp(sharedPortfolioName) })
      .first()
      .click();

    // The "Shared" badge is present...
    await expect(recipientPage.getByText("Shared", { exact: true })).toBeVisible();

    // ...and every mutation control is absent for a read-only viewer.
    await expect(
      recipientPage.getByRole("button", { name: "Edit portfolio details" })
    ).toHaveCount(0);
    await expect(
      recipientPage.getByRole("link", { name: "Import" })
    ).toHaveCount(0);
    await expect(
      recipientPage.getByRole("link", { name: "Add Holding" })
    ).toHaveCount(0);
    await expect(
      recipientPage.getByRole("button", { name: "New Transaction" })
    ).toHaveCount(0);

    await recipientContext.close();
  });
});
