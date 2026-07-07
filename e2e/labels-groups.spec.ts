import { test, expect } from "@playwright/test";

/**
 * Labels and custom groups (read-only, v2.1.x).
 *
 * Exercises the SEEDED labels ("Core" / "Growth" / "Income") and the seeded
 * custom group "Asset Strategy" (categories "Defensive" / "Growth" /
 * "Fixed Income", with BHP & CSL intentionally unassigned). All assertions are
 * READ-ONLY against the seed, so parallel workers share it safely. Runs
 * authenticated (shared storageState = test@investalens.dev).
 */

test.describe("labels & groups settings (seeded)", () => {
  test("Settings → Labels lists the seeded Core / Growth / Income labels", async ({
    page,
  }) => {
    await page.goto("/settings/labels");
    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible();

    await expect(page.getByRole("cell", { name: "Core", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Growth", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Income", exact: true })).toBeVisible();
  });

  test("Settings → Custom Groups lists Asset Strategy with its 3 categories", async ({
    page,
  }) => {
    await page.goto("/settings/groups");
    await expect(
      page.getByRole("heading", { name: "Custom Groups" })
    ).toBeVisible();

    // The seeded group and its three category names all render on the card.
    await expect(
      page.getByRole("heading", { name: "Asset Strategy" })
    ).toBeVisible();
    const card = page
      .locator("div.rounded-lg")
      .filter({ has: page.getByRole("heading", { name: "Asset Strategy" }) })
      .last();
    // Category names render as `<span class="font-medium">…</span>` in the
    // category list. Scope to those spans — the same names also appear as
    // <option>s in the per-instrument assignment selects, which we must exclude.
    await expect(
      card.locator("span.font-medium", { hasText: "Defensive" })
    ).toBeVisible();
    await expect(
      card.locator("span.font-medium", { hasText: "Fixed Income" })
    ).toBeVisible();
    // "Growth" is also a label name/category elsewhere; assert its category line
    // carries an instrument count to pin it to this group's category list.
    await expect(
      card.locator("div", { hasText: /^Growth\(\d+ instruments\)$/ }).first()
    ).toBeVisible();
  });
});

test.describe("reports filtered by seeded labels & groups", () => {
  test("Performance report filters by the seeded Core label", async ({
    page,
  }) => {
    test.setTimeout(120000);

    // The App Router updates the URL only after the server round-trip (slow
    // under dev first-compile), so allow generous time; the growth chart
    // confirms the report rendered with the label filter applied.
    await page.goto("/reports/performance", { waitUntil: "commit" });
    const labelFilter = page.getByLabel("Label", { exact: true });
    await expect(labelFilter).toBeVisible({ timeout: 90000 });
    await labelFilter.selectOption({ label: "Core" });
    await expect(page).toHaveURL(/label=/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Performance Report" })
    ).toBeVisible();
    await expect(page.getByText("Portfolio growth")).toBeVisible({
      timeout: 90000,
    });
  });

  test("Diversity report groups by the seeded Asset Strategy group (Unassigned bucket)", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await page.goto("/reports/diversity", { waitUntil: "commit" });
    const groupBy = page.getByLabel("Group by:", { exact: true });
    await expect(groupBy).toBeVisible({ timeout: 90000 });
    await groupBy.selectOption({ label: "Asset Strategy" });

    // Custom-group values are `custom:<id>`, so the param reads groupBy=custom…
    await expect(page).toHaveURL(/groupBy=custom/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Diversity Report" })
    ).toBeVisible();

    // BHP & CSL are intentionally unassigned in the seed, so an "Unassigned"
    // bucket appears in the grouped report's Group column.
    await expect(
      page.getByRole("cell", { name: "Unassigned", exact: true })
    ).toBeVisible({ timeout: 90000 });
  });
});
