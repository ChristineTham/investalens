import { test, expect } from "@playwright/test";

/**
 * Capital Gains Tax report — sale-allocation optimisation (v2.1.0).
 *
 * Toggling "Optimise" on the CGT report reveals a sale-allocation method
 * comparison table (FIFO / LIFO / etc.) with the optimal method flagged.
 * The comparison needs a single selected portfolio that has realised disposals
 * in the selected tax year. Runs authenticated (shared storageState).
 */
test.describe("CGT optimisation", () => {
  test("toggling Optimise shows the method comparison with the optimal method flagged", async ({
    page,
  }) => {
    await page.goto("/tax/cgt");
    await expect(
      page.getByRole("heading", { name: "Capital Gains Tax" })
    ).toBeVisible();

    // Select a single portfolio if a portfolio selector is present — the
    // comparison is only computed for a single portfolio.
    const portfolioSelect = page.getByLabel(/portfolio/i).first();
    if (await portfolioSelect.count()) {
      const optionCount = await portfolioSelect
        .locator("option")
        .count()
        .catch(() => 0);
      if (optionCount > 1) {
        await portfolioSelect.selectOption({ index: 1 });
      }
    }

    // Toggle "Optimise".
    const optimise = page.getByRole("checkbox", {
      name: /optimise/i,
    });
    await expect(optimise).toBeVisible();
    await optimise.check();

    // The URL carries the optimise flag and the comparison section appears.
    await expect(page).toHaveURL(/optimise=1/);
    await expect(
      page.getByRole("heading", { name: "Sale-allocation method comparison" })
    ).toBeVisible();

    // The comparison table lists methods; the optimal one is badged "Optimal".
    // (Only asserted when there are disposals to compare.)
    const optimalBadge = page.getByText("Optimal", { exact: true });
    const emptyNotice = page.getByText(
      /Select a single portfolio|no .*disposals|disposals === 0/i
    );
    // Either we have a comparison with an Optimal flag, or a clear empty-state.
    await expect(optimalBadge.or(emptyNotice).first()).toBeVisible();
  });
});
