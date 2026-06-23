/**
 * Verify the proposed 2027 CGT engine against the published worked examples
 * (H&R Block "Proposed Capital Gains Tax Changes in Australia", 2026 Budget).
 *
 * Deterministic and DB-free — uses a synthetic CPI map chosen to reproduce the
 * indexation factors quoted in the examples.
 *
 *   npx tsx scripts/verify-cgt-2027.ts
 */
import {
  assessableUnder2027,
  minimumTaxTopUp,
  TRANSITION_DATE,
  type Cgt2027Input,
} from "../lib/calculations/cgt-2027";
import { cpiQuarterKey, type CpiMap } from "../lib/calculations/indexation";

// ── Synthetic CPI: base quarter = 100, disposal quarters set to 100 × factor ──
const cpi: CpiMap = new Map();
cpi.set(cpiQuarterKey(TRANSITION_DATE), 100); // 2027-Q3 base for straddle assets
function setFactor(disposal: Date, factor: number) {
  cpi.set(cpiQuarterKey(disposal), 100 * factor);
}

let failures = 0;
function check(label: string, actual: number, expected: number, tol = 1) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `  [${status}] ${label}: ${actual.toFixed(0)} (expected ${expected.toFixed(0)})`
  );
}

function run(label: string, input: Cgt2027Input) {
  console.log(`\n${label}`);
  return assessableUnder2027(input);
}

// ── Example 1: shares acquired after CGT, top marginal rate ──
setFactor(new Date("2030-06-30T00:00:00Z"), 1.093);
{
  const r = run("Example 1 — post-CGT shares (market value method)", {
    acquisitionDate: new Date("2020-07-01T00:00:00Z"),
    disposalDate: new Date("2030-06-30T00:00:00Z"),
    costBase: 100_000,
    proceeds: 300_000,
    taxEntityType: "individual",
    marketValueAt2027: 190_000,
    transitionMethod: "market_value",
    cpi,
  });
  check("pre assessable (after 50% discount)", r.preAssessable, 45_000);
  check("post indexed cost base", r.postIndexedCostBase, 207_670, 50);
  check("post assessable", r.postAssessable, 92_330, 50);
  check("total assessable", r.totalAssessable, 137_330, 50);
}

// ── Example 2: pre-CGT family asset sold after 1 July 2027 ──
setFactor(new Date("2029-06-30T00:00:00Z"), 1.061);
{
  const r = run("Example 2 — pre-CGT asset (cost-base reset)", {
    acquisitionDate: new Date("1982-03-15T00:00:00Z"),
    disposalDate: new Date("2029-06-30T00:00:00Z"),
    costBase: 80_000,
    proceeds: 2_800_000,
    taxEntityType: "individual",
    marketValueAt2027: 2_500_000,
    cpi,
  });
  check("pre assessable (exempt)", r.preAssessable, 0);
  check("post indexed cost base", r.postIndexedCostBase, 2_652_500, 100);
  check("post assessable", r.postAssessable, 147_500, 100);
  check("total assessable", r.totalAssessable, 147_500, 100);
}

// ── Example 3: low-income retiree, minimum tax in action ──
setFactor(new Date("2028-06-15T00:00:00Z"), 1.02);
{
  const r = run("Example 3 — retiree (minimum tax top-up)", {
    acquisitionDate: new Date("2019-12-01T00:00:00Z"),
    disposalDate: new Date("2028-06-15T00:00:00Z"),
    costBase: 50_000,
    proceeds: 135_000,
    taxEntityType: "individual",
    marketValueAt2027: 120_000,
    transitionMethod: "market_value",
    cpi,
  });
  check("pre assessable (after 50% discount)", r.preAssessable, 35_000);
  check("post assessable", r.postAssessable, 12_600, 50);
  check("total assessable", r.totalAssessable, 47_600, 50);
  // Marginal rate on the gain ≈ $2,500 tax on $12,600 → top-up to 30%.
  const topUp = minimumTaxTopUp(r.minTaxCapitalGain, 2_500 / 12_600, false);
  check("minimum-tax top-up", topUp, 1_280, 30);
}

// ── Example 4: start-up founder, indexation vs discount ──
setFactor(new Date("2031-06-30T00:00:00Z"), 1.126);
{
  const r = run("Example 4 — founder (low cost base)", {
    acquisitionDate: new Date("2021-05-01T00:00:00Z"),
    disposalDate: new Date("2031-06-30T00:00:00Z"),
    costBase: 10_000,
    proceeds: 5_000_000,
    taxEntityType: "individual",
    marketValueAt2027: 1_200_000,
    transitionMethod: "market_value",
    cpi,
  });
  check("pre assessable (after 50% discount)", r.preAssessable, 595_000);
  check("post indexed cost base", r.postIndexedCostBase, 1_351_200, 200);
  check("post assessable", r.postAssessable, 3_648_800, 200);
  check("total assessable", r.totalAssessable, 4_243_800, 200);
}

// ── Example 5: fully post-2027 asset (no split) ──
setFactor(new Date("2034-07-31T00:00:00Z"), 1.23);
{
  const r = run("Example 5 — fully post-2027 asset", {
    acquisitionDate: new Date("2027-08-01T00:00:00Z"),
    disposalDate: new Date("2034-07-31T00:00:00Z"),
    costBase: 800_000,
    proceeds: 1_200_000,
    taxEntityType: "individual",
    cpi,
  });
  check("pre assessable (none)", r.preAssessable, 0);
  check("post indexed cost base", r.postIndexedCostBase, 984_000, 50);
  check("post assessable", r.postAssessable, 216_000, 50);
  check("total assessable", r.totalAssessable, 216_000, 50);
}

// ── Apportionment safe-harbour sanity check (no market value, no CPI) ──
{
  const r = run("Apportionment — 50/50 split, no indexation", {
    acquisitionDate: new Date("2017-07-01T00:00:00Z"),
    disposalDate: new Date("2037-07-01T00:00:00Z"),
    costBase: 100_000,
    proceeds: 300_000,
    taxEntityType: "individual",
    transitionMethod: "apportionment",
    cpi,
  });
  check("pre gross gain (~50% of 200k)", r.preGrossGain, 100_000, 200);
  check("pre assessable (after 50% discount)", r.preAssessable, 50_000, 100);
  check("post assessable (no indexation)", r.postAssessable, 100_000, 200);
  check("total assessable", r.totalAssessable, 150_000, 200);
}

console.log(
  `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`
);
process.exit(failures === 0 ? 0 : 1);
