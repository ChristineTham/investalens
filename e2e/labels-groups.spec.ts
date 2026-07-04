import { test, expect } from "@playwright/test";
import { createPortfolio, addHolding } from "./helpers";

/**
 * Labels and custom groups (v2.1.0).
 *
 * Labels: create one on Settings -> Labels and attach it to a holding.
 * Custom groups: create a group + category on Settings -> Groups and assign an
 * instrument to a category.
 *
 * Both features also feed a "filter/group the report" flow, but the
 * /reports/performance and /reports/diversity pages currently throw a
 * server->client render error ("Functions are not valid as a child of Client
 * Components", from a ChartCard render-prop child) as soon as the account has
 * any holdings. That is a production-app bug outside the e2e scope (we may only
 * edit files under e2e/), so the report-side assertions are documented skips
 * until the app is fixed. Runs authenticated (shared storageState).
 */

test.describe("labels", () => {
  test("create a label and attach it to a holding", async ({ page }) => {
    // A holding is required for the attach step — create a fresh portfolio and
    // holding through the UI so the test is self-contained. The portfolio name
    // is unique so we can disambiguate this run's BHP holding from the seeded
    // BHP (and BHP holdings left by earlier runs) in the Manage-holdings dialog,
    // which lists EVERY holding across all the user's portfolios.
    const portfolioName = `E2E Label Portfolio ${Date.now()}`;
    const portfolioId = await createPortfolio(page, portfolioName);
    await addHolding(page, portfolioId, { code: "BHP" });

    const labelName = `E2E Label ${Date.now()}`;

    await page.goto("/settings/labels");
    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible();

    // Create the label.
    await page.getByLabel("Label name").fill(labelName);
    await page.getByRole("button", { name: "Add Label" }).click();
    await expect(page.getByRole("cell", { name: labelName })).toBeVisible();

    // Open the label's "Manage holdings" dialog and tick the BHP holding.
    const row = page.getByRole("row", { name: new RegExp(labelName) });
    await row.getByRole("button", { name: "Manage holdings" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The dialog lists every holding across all the user's portfolios, each
    // checkbox wrapped in a <label> reading "<code> <name> <portfolioName>".
    // Target THIS run's BHP holding by matching both BHP and the unique
    // portfolio name — clicking .first() could tick an unrelated seeded holding.
    // Ticking fires a server action + router.refresh(); the controlled checkbox
    // is driven by that navigation, so click it (rather than .check(), which
    // asserts an immediate state change the navigation reverts) and verify the
    // attachment via the chip that appears in the label's row.
    await dialog
      .getByRole("checkbox", {
        name: new RegExp(`BHP.*${portfolioName}`),
      })
      .click();

    // Close the dialog and confirm the attachment shows as a chip in the row.
    await page.keyboard.press("Escape");
    await expect(
      page
        .getByRole("row", { name: new RegExp(labelName) })
        .getByText("BHP", { exact: true })
    ).toBeVisible();
  });

  // Filter the Performance report by a label. Uses the seeded "Core" label
  // (attached to BHP/CBA/VAS in the sample portfolio).
  test("filter the Performance report by a label", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/reports/performance", { waitUntil: "commit" });
    const labelFilter = page.getByLabel("Label", { exact: true });
    await expect(labelFilter).toBeVisible({ timeout: 90000 });
    await labelFilter.selectOption({ label: "Core" });
    // Filter applied via the URL and the report still renders (no
    // server->client render crash) with its growth chart. The App Router
    // updates the URL only after the server round-trip, which is slow under
    // dev first-compile, so allow generous time.
    await expect(page).toHaveURL(/label=/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Performance Report" })
    ).toBeVisible();
    await expect(page.getByText("Portfolio growth")).toBeVisible({
      timeout: 90000,
    });
  });
});

test.describe("custom groups", () => {
  test("create a group + category and assign an instrument", async ({
    page,
  }) => {
    const groupName = `E2E Group ${Date.now()}`;
    // Unique category name so its option text can't collide with categories
    // created by earlier runs against the same test DB.
    const categoryName = `Core ${Date.now()}`;
    const code = "CBA";

    // Need a holding so an instrument is available to assign.
    const portfolioId = await createPortfolio(
      page,
      `E2E Group Portfolio ${Date.now()}`
    );
    await addHolding(page, portfolioId, { code });

    await page.goto("/settings/groups");
    await expect(
      page.getByRole("heading", { name: "Custom Groups" })
    ).toBeVisible();

    // Create the group.
    await page.getByLabel("Group name").fill(groupName);
    await page.getByRole("button", { name: "Add Group" }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    // Scope to the newly created group's card.
    const groupCard = page
      .locator("div.rounded-lg")
      .filter({ has: page.getByRole("heading", { name: groupName }) })
      .last();

    // Add a category within the group; a new empty category reads "(0 …)".
    await groupCard.getByLabel("Category name").fill(categoryName);
    await groupCard.getByRole("button", { name: "Add category" }).click();
    // The category line renders the name and an instrument count in adjacent
    // spans (no separating text), so assert the count directly — this fresh
    // card has exactly one category.
    await expect(groupCard.getByText("(0 instruments)")).toBeVisible();

    // Assign the CBA instrument to the new category via its per-instrument
    // select. selectOption drives a server action + router.refresh().
    await groupCard
      .getByLabel(`Category for ${code}`)
      .selectOption({ label: categoryName });

    // The category's instrument count reflects the assignment (the label always
    // uses the plural "instruments").
    await expect(groupCard.getByText("(1 instruments)")).toBeVisible();
  });

  // Group the Diversity report by the seeded "Asset Strategy" custom group.
  // BHP is intentionally left unassigned in the sample, so an "Unassigned"
  // bucket appears alongside the Defensive/Growth categories.
  test("group the Diversity report by a custom group", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/reports/diversity", { waitUntil: "commit" });
    const groupBy = page.getByLabel("Group by:", { exact: true });
    await expect(groupBy).toBeVisible({ timeout: 90000 });
    await groupBy.selectOption({ label: "Asset Strategy" });
    // The custom grouping is applied via the URL and the report renders
    // (no server->client crash) with the Unassigned bucket.
    await expect(page).toHaveURL(/groupBy=custom/);
    await expect(page.getByText("Unassigned").first()).toBeVisible({
      timeout: 90000,
    });
  });
});
