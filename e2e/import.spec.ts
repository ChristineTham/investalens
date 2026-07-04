import { test, expect } from "@playwright/test";

/**
 * Import hub + guided wizard (v2.1.0).
 *
 * The quick-import hub offers one-click broker buttons (including CMC Markets).
 * The guided import wizard walks Upload -> Configure -> Map -> Review.
 *
 * These navigate into a portfolio's /import route, so the authenticated user
 * needs at least one portfolio (see portfolio.spec.ts, or seed data). Runs
 * authenticated (shared storageState).
 */
async function openFirstPortfolioImport(page: import("@playwright/test").Page) {
  await page.goto("/portfolio");
  // Open the first real portfolio card (skip the consolidated card).
  const firstPortfolio = page
    .getByRole("link", { name: /portfolio|holding/i })
    .filter({ hasNotText: "Consolidated" })
    .first();
  await firstPortfolio.click();
  await page.getByRole("link", { name: "Import" }).click();
  await expect(page.getByRole("heading", { name: "Import", exact: true })).toBeVisible();
}

test.describe("import hub", () => {
  test("quick-import hub shows broker buttons including CMC Markets", async ({
    page,
  }) => {
    await openFirstPortfolioImport(page);

    await expect(
      page.getByRole("heading", { name: "Quick Import" })
    ).toBeVisible();

    // Broker one-click buttons are rendered; CMC Markets must be present.
    await expect(
      page.getByRole("button", { name: "CMC Markets" })
    ).toBeVisible();
    // A couple of the other documented brokers for good measure.
    await expect(page.getByRole("button", { name: "CommSec" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SelfWealth" })).toBeVisible();
  });

  test("guided import wizard steps Upload -> Configure -> Map -> Review", async ({
    page,
  }) => {
    await openFirstPortfolioImport(page);

    // The Guided Import section offers the Share Transactions category.
    await expect(
      page.getByRole("heading", { name: "Guided Import" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Share Transactions" }).click();

    // Step 1 — Upload: a dropzone with a labelled file input.
    const fileInput = page.getByLabel("Upload import file");
    await expect(fileInput).toBeAttached();

    // Provide a small CSV so the wizard advances into Configure.
    const csv = [
      "Date,Code,Type,Quantity,Price",
      "2024-01-15,BHP,BUY,100,40.00",
    ].join("\n");
    await fileInput.setInputFiles({
      name: "trades.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    // Step 2 — Configure: "File Detected" then advance to mapping.
    await expect(page.getByText("File Detected")).toBeVisible();
    await page.getByRole("button", { name: "Next: Map Fields" }).click();

    // Step 3 — Map: column mapping, then advance to review.
    await expect(page.getByText("Map Columns")).toBeVisible();
    await page.getByRole("button", { name: "Next: Review" }).click();

    // Step 4 — Review: the parsed rows are shown for confirmation.
    await expect(page.getByText("BHP")).toBeVisible();
  });
});
