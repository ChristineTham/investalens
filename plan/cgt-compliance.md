# CGT Compliance & CPI Indexation — Implementation Plan

> **Goal**: Make InvestaLens' tax reports comply with the Australian CGT regime —
> the **current law** (50% discount + pre-1999 CPI indexation method + bond
> exemption) and the **proposed 2027 regime** (indexation replaces discount, 30%
> minimum tax, pre-1985 assets brought in, asymmetric losses, transitional
> deemed-disposal rules).
>
> **Status legend**: ⬜ not started · 🟡 in progress · ✅ done (tested in Codespaces)
>
> **Working method**: implement one step at a time, then **stop and prompt the
> user to test in Codespaces** before starting the next step. Local machine
> cannot run installs/builds/migrations (corporate proxy); all verification runs
> in Codespaces.

---

## Research summary (verified 2026-06-23)

### Current regime (pre 1 July 2027)

**Shares / units / listed securities**

- CGT event on disposal (sale, off-market transfer, takeover). Cost base =
  purchase price + brokerage (buy **and** sell). Dividends & franking credits are
  ordinary income, **not** CGT.
- **Discount method**: held > 12 months → individuals/trusts 50%, SMSF 33⅓%,
  companies 0%.
- **Indexation method** (alternative): only for assets acquired **before
  11:45am 21 September 1999**. Cost base is indexed by CPI, with the index
  **frozen at the September 1999 quarter**. Indexation factor =
  `CPI(event quarter, capped at Sep-1999) ÷ CPI(expenditure quarter)`, rounded to
  3 decimals. Taxpayer chooses the method giving the lower gain. Indexation
  cannot create or increase a loss.
- **Capital losses**: offset capital gains only (never salary/other income);
  carry forward indefinitely; applied before the discount.

**Bonds**

- **Traditional bonds** (ordinary company/government bonds held by retail
  investors): generally **exempt from CGT**. Buy-at-discount → redeem-at-par
  gains are **ordinary income** (Div 16E / s.26C style accrual), declared in full
  with **no CGT discount**.
- **Listed / exchange-traded debt & hybrids** (convertible notes, capital notes):
  **subject to CGT** when sold on-market before maturity.

### Proposed 2027 regime — *Treasury Laws Amendment (Tax Reform No. 1) Bill 2026*

> Introduced to Parliament 28 May 2026. **Not yet law.** Commences 1 July 2027.
> Sources: budget.gov.au, PwC tax alert (Bill + EM), H&R Block worked examples.

- **CGT events on/after 1 July 2027**: 50% discount **removed** for resident
  individuals & trusts, **replaced by cost-base indexation** (asset held ≥12
  months; residency required — a single day of foreign residency disqualifies
  indexation). Indexation applies to all cost-base elements **except the 3rd
  element** (ownership costs). Companies, super funds, life insurers keep existing
  settings (no discount, no indexation).
- **Deemed disposal & reacquisition**: assets held on 30 June 2027 are deemed
  sold just before 1 July 2027 and reacquired on 1 July 2027 at **market value**
  (default) **or** an **apportionment method** (time-based) chosen at the eventual
  realisation. The pre-2027 component is calculated under existing law (incl. 50%
  discount, deferred); the post-2027 component uses the indexed cost base. Both
  combine at ultimate realisation.
- **Apportionment formula** (ATO safe harbour):
  `pre-2027 gain = total gain × (days held before 1 Jul 2027 ÷ total days held)`.
- **Indexation formula**: `Indexed cost base = cost base × (CPI at disposal ÷ CPI
  at acquisition or 1 Jul 2027)`, compounded; taxes only the **real** gain.
- **30% minimum tax**: on the "minimum tax capital gain" (post-2027 portion).
  Tops up to an effective 30% where marginal rate on the gain is lower. **Exempt**:
  income-support recipients (Age Pension, JobSeeker, DSP, Parenting Payment).
  Applies to individuals and trust beneficiaries; **not** super funds.
- **Pre-CGT assets** (acquired before 20 Sep 1985): blanket exemption ends for
  **all entities incl. companies**. Deemed cost base reset to MV at 1 July 2027;
  pre-2027 growth stays exempt; only post-2027 growth is taxed.
- **Assets acquired 20 Sep 1985 – 21 Sep 1999**: lose the choice between frozen
  indexation and the 50% discount after 1 July 2027 — only the 50% discount
  applies to the deferred pre-2027 component.
- **Asymmetric losses**: gains indexed, **losses nominal** (not indexed).
- **Prescribed loss ordering** & four new categories (deferred non-residential,
  deferred residential, non-residential, residential): losses apply to discount
  (deferred) gains first, then indexed gains.
- **New residential / affordable housing**: may **choose** 50% discount (or up to
  60% affordable) vs the indexation + minimum-tax regime — out of scope for a
  share/bond portfolio tool but noted.

### Data sources (see `docs/KNOWLEDGE.md` → Data Sources — RBA)

- **CPI**: RBA Statistical Table **G1** (All Groups CPI index numbers, quarterly,
  back to 1948) — `https://www.rba.gov.au/statistics/tables/csv/g1-data.csv`.
  Indexation factors are **ratios**, so any consistent CPI series yields the
  correct factor regardless of index base. The ATO's frozen quarterly table
  (Sep 1999 = 68.7) is the legally precise check and can override seeded values.

### Current code gaps (audit)

- `lib/reports/tax/cgt-report.ts` & `unrealised-cgt.ts` run **all** SELL
  transactions/holdings with **no asset-class filter** → bonds are wrongly taxed
  under CGT, and there is **no indexation** (discount only).
- No CPI data model/source. No indexation, pre-1999, pre-1985, 2027, or
  minimum-tax logic. Bond discount/redemption gains not reported as income.
- Classification: `Instrument.instrumentType` ∈ {`equity`,`ETF`,`bond`,`INDEX`};
  bond fields `faceValue`/`couponRate`/`maturityDate`/`paymentFrequency`;
  `isBond()` sets type at import. `Portfolio.taxEntityType`, `saleAllocationMethod`,
  `financialYearEnd`, `taxResidency`.

---

## Staged implementation

Each step is independently testable. **After each step the agent stops and asks
the user to test in Codespaces**, then waits.

### Step 1 — CPI data foundation ⬜

**Build**

- `prisma/schema.prisma`: add `CpiIndex` model (quarter-end date, label, index
  value, source). Migration `add_cpi_index`.
- `scripts/fetch-cpi.ts`: download RBA G1 CSV, parse the All Groups CPI index
  quarterly series, upsert into `CpiIndex`. Supports `--dry-run` and `--verify`
  (prints sample indexation factors).
- `lib/calculations/indexation.ts`: pure helpers — `cpiQuarterKey(date)`,
  `quarterEndDate(date)`, `indexationFactor(cpiAcq, cpiEvent)` (3 dp, never < 1),
  `currentLawIndexationFactor(...)` (event quarter frozen at Sep 1999),
  `loadCpiMap()` (DB loader → `Map`).

**Test in Codespaces**

1. `npx prisma migrate dev --name add_cpi_index`
2. `npx tsx scripts/fetch-cpi.ts --verify`
3. Confirm `CpiIndex` is populated (≈ 1 row/quarter from the 1940s–present) and
   the printed sample factors look sane (e.g. Sep-1990 → Sep-1999 ≈ 1.19).

### Step 2 — Asset-class tax classification (bonds) ⬜

**Build**

- `lib/calculations/asset-tax-class.ts`: classify an instrument as `cgt`
  (shares/ETFs/listed debt/hybrids) vs `income` (traditional non-listed bonds)
  using `instrumentType` + `maturityDate` + market listing. Optional
  `Instrument.taxClass` override column + migration + backfill.
- CGT & unrealised reports: **exclude** `income`-class disposals/holdings.
- Taxable-income report: include traditional-bond **capital growth**
  (discount accretion / gain on sale or maturity) as `interest`-type income.

**Test in Codespaces**: a bond holding no longer appears in the CGT report and
its redemption/sale gain shows in Taxable Income; shares/hybrids still in CGT.

### Step 3 — Indexation method (current law, pre-1999) ⬜

**Build**

- Extend `lib/calculations/parcels.ts` / `cgt-report.ts`: for parcels acquired
  before 21 Sep 1999, compute the indexed cost base and the gain under the
  indexation method; choose the **lower-gain** method (discount vs indexation);
  indexation can't create/increase a loss.
- `CgtItem`: add `indexedCostBase`, `indexationFactor`, `methodUsed`.
- CGT page: show method used + indexed cost base column.

**Test in Codespaces**: a seeded pre-1999 parcel shows the indexation method when
it produces a lower gain; post-1999 parcels stay on the discount method.

### Step 4 — Proposed 2027 regime engine (opt-in) ⬜

**Build**

- `Portfolio`: add `cgtRegime` (`current` | `proposed_2027`),
  `incomeSupportRecipient` (exempt from 30% floor), `isForeignResident`
  (no indexation). Migration.
- `lib/calculations/cgt-2027.ts`: for CGT events ≥ 1 Jul 2027 split gains into
  pre-2027 (deemed MV @ 1 Jul 2027 → existing law incl. 50% discount) and
  post-2027 (indexed from MV/1 Jul 2027). Support both **market-value** (price on
  1 Jul 2027) and **apportionment** (days-based) methods. 30% minimum-tax top-up
  on the post-2027 component. Asymmetric losses + prescribed ordering. Pre-1985
  cost-base reset. Companies/super: no discount/indexation.
- Marginal-rate + Medicare scaffolding for the minimum-tax calc (configurable).

**Test in Codespaces**: reproduce the H&R Block worked examples (shares post-CGT,
pre-CGT farm, low-income retiree minimum-tax top-up, founder) within rounding.

### Step 5 — Reports/UI compliance pass + docs ⬜

**Build**

- CGT, unrealised, taxable-income pages: method/regime selectors, indexed
  columns, 2027 categories, loss carry-forward & ordering, **"proposed law — not
  yet enacted"** disclaimers.
- Update `docs/TAX.md`; reconcile to ATO labels (Item 18 / labels A, H, V);
  keep the dashboard note accurate.

**Test in Codespaces**: full end-to-end report review across a mixed
share/bond/hybrid portfolio under both regimes.

---

## Assumptions & non-goals

- Personal marginal tax rates / Medicare levy are modelled only as far as needed
  for the 30% minimum-tax comparison; this tool is **not** a tax return.
- New-residential/affordable-housing CGT choices, Division 149/7A, CGT event K6,
  small-business concessions, trust streaming, and part-year residency are out of
  scope (flagged in disclaimers).
- The proposed 2027 regime is modelled as an **opt-in projection**; defaults stay
  on current law until the Bill is enacted.
