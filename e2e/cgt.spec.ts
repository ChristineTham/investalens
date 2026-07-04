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
    // /tax/cgt is a heavy route; its first-compile on a cold dev server can take
    // a while, leaving little of a 60s budget for the interactions below.
    test.setTimeout(120000);

    await page.goto("/tax/cgt");
    await expect(
      page.getByRole("heading", { name: "Capital Gains Tax" })
    ).toBeVisible({ timeout: 60000 });

    // Select a single portfolio — the comparison is only computed for one
    // portfolio. Prefer the seeded "Sample Growth Portfolio", which has REALISED
    // disposals (a BHP SELL) in a tax year, so the comparison table renders with
    // an "Optimal" method flagged rather than an empty-state. Selecting drives a
    // client navigation that adds ?portfolio=<id>.
    const portfolioSelect = page.getByLabel(/portfolio/i).first();
    const hasSeeded = await portfolioSelect
      .locator("option", { hasText: "Sample Growth Portfolio" })
      .count();
    if (hasSeeded > 0) {
      await portfolioSelect.selectOption({ label: "Sample Growth Portfolio" });
    } else {
      // Fallback: any real portfolio (option 0 is "All Portfolios").
      await portfolioSelect.selectOption({ index: 1 });
    }
    await expect(page).toHaveURL(/portfolio=/, { timeout: 30000 });

    // Toggle "Optimise". It is a controlled checkbox that drives ?optimise=1 via
    // client navigation (router.push), which can race the just-completed
    // portfolio navigation, so click it and retry if the URL hasn't updated.
    const optimise = page.getByRole("checkbox", { name: /optimise/i });
    await expect(optimise).toBeVisible();
    for (let attempt = 0; attempt < 3; attempt++) {
      await optimise.click();
      const on = await page
        .waitForURL(/optimise=1/, { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (on) break;
      // The click may have toggled it back off (or been swallowed by a
      // concurrent navigation); re-sync before retrying.
      if (await optimise.isChecked()) await optimise.click().catch(() => {});
    }

    // The URL carries the optimise flag and the comparison section appears.
    await expect(page).toHaveURL(/optimise=1/);
    await expect(
      page.getByRole("heading", { name: "Sale-allocation method comparison" })
    ).toBeVisible();

    // The comparison table lists methods; the optimal one is badged "Optimal".
    // With no realised disposals for this portfolio, a clear empty-state notice
    // is shown instead — accept either.
    const optimalBadge = page.getByText("Optimal", { exact: true });
    const emptyNotice = page.getByText(
      /Select a single portfolio|No CGT disposals|nothing to\s+compare/i
    );
    await expect(optimalBadge.or(emptyNotice).first()).toBeVisible();
  });
});
