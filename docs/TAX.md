# InvestaLens Tax Reporting (Australian Focus)

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Tools & Reports](TOOLS.md) | Next: [Corporate Actions](ACTIONS.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                                     | Status                                                |
> | ------------------------------------------- | ----------------------------------------------------- |
> | Taxable Income Report                       | ✅ Implemented                                        |
> | CGT Report (discount + CPI indexation methods) | ✅ Implemented                                     |
> | CGT parcel matcher (optimiser)              | ✅ Implemented                                        |
> | Unrealised CGT Report (indexation-aware)    | ✅ Implemented                                        |
> | Bond CGT exemption / income treatment       | ✅ Implemented                                        |
> | Proposed 2027 regime projection (opt-in)    | ✅ Implemented                                        |
> | AMIT components (schema field)              | ✅ Schema ready, ⏳ full processing To be Implemented |
> | Stapled securities                          | ⏳ To be Implemented                                  |
> | Foreign exchange rates for CGT              | ⏳ To be Implemented (R3)                             |
> | Lock-in (save method per FY)                | ⏳ To be Implemented                                  |
> | Tax planning strategies UI                  | ⏳ To be Implemented                                  |
> | Xero Integration                            | ⏳ To be Implemented                                  |
> | Division 296 (SMSF)                         | ⏳ To be Implemented                                  |

## Overview

InvestaLens provides comprehensive tax reporting for Australian investors. The Tax tab gives you access to all tax reports for your portfolio, as well as a high-level tax summary to help understand your tax position at a glance.

> **Disclaimer:** InvestaLens does not provide taxation advice and the reports do not constitute personal taxation advice. If you have any questions about your tax position, contact your accountant or tax adviser. You remain solely responsible for complying with all applicable accounting, tax, and other laws.

**Jump to:**

- [Tax Summary](#tax-summary)
- [Tax Reports](#tax-reports)
- [Taxable Income Report](#taxable-income-report)
- [Capital Gains Tax (CGT) Report](#capital-gains-tax-cgt-report)
- [Unrealised CGT Report](#unrealised-cgt-report)
- [CGT Methods, Indexation & Bonds](#cgt-methods-indexation--bonds)
- [Proposed 2027 CGT Regime (Projection)](#proposed-2027-cgt-regime-projection)
- [Annual Tax Statement Components (AMIT)](#annual-tax-statement-components-amit)
- [Stapled Securities](#stapled-securities)
- [Foreign Exchange Rates and CGT](#foreign-exchange-rates-and-cgt)
- [Tax Planning Strategies](#tax-planning-strategies)

---

## Tax Summary

The Tax Summary is displayed at the top of the Tax tab and pulls key information from your Taxable Income Report and Capital Gains Tax Report. Use the financial year selector to view your tax summary for a specific year.

### Taxable Income Summary

| Item                       | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| Dividend & interest income | All dividend and interest income received in the period                |
| Capital gains              | Net capital gain figure from the CGT Report                            |
| Franking credits           | Franking credits attached to your dividend income                      |
| Total assessable income    | Sum of dividend & interest income, capital gains, and franking credits |

### Capital Gain Summary

| Item                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| Total capital gains | Gross capital gains from all sales in the period           |
| Current year losses | Capital losses realised in the current year                |
| CGT discount %      | Discount rate applied based on tax entity type             |
| Net capital gain    | Final taxable capital gain after applying the CGT discount |

### Tax Details

| Setting                 | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| Tax residency           | Country of tax residency set for your portfolio        |
| Portfolio base currency | Currency used to report portfolio values               |
| Tax entity type         | Individual, Company, SMSF, or Trust                    |
| CGT discount %          | Discount rate for long-term capital gains              |
| Sale allocation method  | Method used to calculate CGT (e.g. FIFO, Minimise CGT) |

---

## Tax Reports

The following reports are accessible from the Tax tab:

| Report                                                          | Description                                                             |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Taxable Income Report](#taxable-income-report)                 | Lists all dividend and interest income required for your tax return     |
| [Capital Gains Tax (CGT) Report](#capital-gains-tax-cgt-report) | Calculates realised capital gains and losses, applying the CGT discount |
| [Unrealised CGT Report](#unrealised-cgt-report)                 | Shows potential CGT liability if current holdings were sold today       |
| Historical Cost Report                                          | Original purchase cost for tax and record-keeping purposes              |
| All Trades Report                                               | Complete record of all buy and sell transactions                        |

---

## Taxable Income Report

Shows all dividend, distribution, and interest income received within a selected date range. Designed to help you complete your Australian tax return by presenting portfolio income in the format required by the ATO.

> **Data source for franking:** franked/unfranked amounts and franking credits are captured from **imported dividend/AMMA statements** or **manual entry**. The price feed (Yahoo Finance) provides only the **gross cash dividend** — auto-fetched dividends are therefore recorded **unclassified** (treated as unfranked with no credits), and ETF/trust distributions are not split into their tax components. To classify a payment, open the holding's **Transaction History** and use the coins icon on the dividend row — you can enter franked/unfranked amounts, franking credits, tax-deferred and foreign tax, and compute the credits from the franked amount at the 30% or 25% company tax rate — or import the relevant statement.

### Income Categories

Income is grouped into three sections:

1. **Local Non-Trust Income** — Dividends and interest from Australian shares and other non-trust investments
2. **Local Trust Income** — Distributions from ETFs, managed funds, and other trust investments
3. **Foreign Income** — Income received from international investments

### Column Descriptions

| Column                   | Description                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Paid Date / Tax Date     | Date the payment was credited to you                                                 |
| Total Income             | Total income figure for the payment                                                  |
| Net Dividend             | Total income less withholding tax — the cash actually received                       |
| Franked Amount           | Dividend amount with franking credits attached                                       |
| Unfranked Amount         | Australian assessable dividend without franking credits                              |
| Interest                 | Interest income amount                                                               |
| Tax Deferred             | Non-assessable amount that adjusts cost base for CGT purposes                        |
| AMIT Decrease            | Trust distribution where cash exceeds taxable income attributed; decreases cost base |
| AMIT Increase            | Trust distribution where taxable income exceeds cash; increases cost base            |
| Foreign Source Income    | Gross non-Australian assessable income (before tax credits)                          |
| Discounted Capital Gains | Grossed up and included with capital gains on the CGT Report                         |
| CGT Concessions          | CGT discount in distributions; non-assessable, does not alter cost base              |
| Non Assessable           | Used to reduce reduced cost base; does not affect cost base                          |
| TFN Withholding Tax      | Australian tax deducted (typically where TFN not provided)                           |
| Foreign Income Tax       | Foreign tax withheld on overseas income                                              |
| Franking Credits         | Franking credits attached to dividends                                               |
| Other Net FSI            | Non-Australian assessable income after offsetting allowable expenses                 |
| LIC Capital Gain         | LIC dividend attributable to a capital gain (50% deduction available)                |
| Gross Amount             | Total amount before any deductions                                                   |

### Australian Income Totals

Provides the total Australian income and total franking credits.

### Foreign Income Table

Includes: Date Paid, Exchange Rate, Net Amount (Foreign), Foreign Tax Withheld, Gross Amount.

### Income Tax Return Section

For Individual tax entity Australian portfolios, this section helps complete your income tax return:

- ATO form codes are shown on the left
- Information icons explain each figure
- Values map directly to the relevant fields in the ATO tax return

> **Note:** Remember to add income from sources not recorded in InvestaLens (such as property, annuities, etc.) before completing your income tax return.

### Advanced Options

- **Show Comments** — Display comments associated with dividends or distributions
- **Show Holding Totals** — Display totals across all payouts for a single investment (useful for reconciling with annual tax statements)

---

## Capital Gains Tax (CGT) Report

Calculates capital gains made on shares as per Australian Tax Office rules. The report may be run over any date range.

> **Note:** This report is only available in Australian tax residency portfolios.

### Calculation Method

- **Discount method** — For shares held more than 12 months (default 50% discount for individuals)
- **Other method** — For shares held less than 12 months (no discount)

The discount rate is determined by the tax entity type set in portfolio settings:

- Individuals / Trust — 50%
- Self-Managed Super Fund — 33⅓%
- Company — 0%

### Report Overview

#### Losses Carried Forward

Shows losses applied for the selected financial year. Click **Edit** to enter capital losses carried forward from a previous year.

> **Note:** InvestaLens does not automatically carry forward losses from previous years. You need to enter these manually each time you run the report.

#### Sale Allocation Method

Shows the allocation method currently assigned to the reporting period (default: FIFO). Click **Optimise** to automatically select the most tax-effective method.

#### Capital Gains or Losses

| Figure                           | ATO Code | Description                                                |
| -------------------------------- | -------- | ---------------------------------------------------------- |
| Total current year capital gains | 18H      | Gross capital gain before losses or discounts              |
| Net capital gain                 | 18A      | Final taxable capital gain after all offsets and discounts |
| Net capital loss carried forward | 18V      | Excess losses available to carry forward to future years   |

**Net capital gain calculation:**

1. **Short-term component**: Short-term capital gains + non-discounted distributions − capital losses (including carried forward)
2. **Long-term component**: Long-term capital gains + discounted distributions − remaining losses, with CGT discount applied
3. **Net capital gain (18A)** = Net short-term gains + discounted long-term gains

#### Breakdown Tabs

| Tab                          | Description                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| All Holdings                 | Summary with instrument code, market, sold quantity, gains, losses, distributions   |
| Short-term Gains             | Parcels held < 12 months (no CGT discount)                                          |
| Long-term Gains              | Parcels held ≥ 12 months (eligible for CGT discount)                                |
| Losses                       | Parcels sold below cost base + losses carried forward                               |
| Non-discounted Distributions | Capital gains from trust/ETF rebalancing (no discount eligible)                     |
| Discounted Distributions     | Capital gains from trust distributions (discount already applied, need grossing up) |
| Exemptions                   | Parcels exempt from CGT (e.g. assets acquired before 20 September 1985)             |

### Locking CGT Positions

Once satisfied with the sale allocation method for a period, click **Lock for period** to preserve settings.

> **Note:** CGT positions must be locked in chronological order. Lock each financial year before moving to the next.

---

## Unrealised CGT Report

Calculates unrealised capital gains in your portfolio and the resulting taxable income that would arise if holdings were sold on the report date. This is a **forecasting tool only** — use the CGT Report for actual realised gains.

### Report Sections

| Section                               | Description                                                         |
| ------------------------------------- | ------------------------------------------------------------------- |
| Short-term Capital Gains (unrealised) | Holdings with gains held < 12 months (taxed in full)                |
| Long-term Capital Gains (unrealised)  | Holdings with gains held ≥ 12 months (eligible for CGT discount)    |
| Capital Losses (unrealised)           | Holdings currently at a loss (would offset gains if sold)           |
| Summary                               | Hypothetical net taxable capital gain if entire portfolio were sold |

### Parcel-Level Columns

| Column                 | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| Sale Allocation Method | Method determining which parcel is deemed sold first                |
| Purchase Date          | Date the parcel was purchased (determines CGT discount eligibility) |
| Quantity               | Units in the parcel (adjusted for capital returns/reconstructions)  |
| Cost Base              | Original purchase price, adjusted for capital returns               |
| Market Value           | Value of the parcel on the report date                              |
| Gain (or Loss)         | Difference between market value and cost base                       |

### Summary Calculation

1. **Adjust cost base** — Apply any return of capital or capital reconstruction adjustments
2. **Offset capital losses** — Apply losses against short-term gains first, then long-term gains
3. **Apply CGT discount** — Discount remaining long-term gains by applicable rate (default 50%)
4. **Sum the result** — Short-term gains (after losses) + discounted long-term gains = net taxable capital gain

### Running the Report

1. Select the report date
2. (Optional) Enter carry forward losses in Advanced Options
3. Choose the Sale Allocation Method (FIFO, LIFO, Minimise/Maximise Capital Gain, Minimise CGT)
4. Click **Update current report**

> **Note:** InvestaLens does not automatically account for capital losses from previous tax years. Carry forward losses must be entered manually and are not saved between report runs.

---

## CGT Methods, Indexation & Bonds

Australian CGT offers two ways to work out a gain on an asset held for at least
12 months:

- **Discount method** — the nominal gain (proceeds − cost base) is reduced by the
  CGT discount: 50% for individuals and trusts, 33⅓% for SMSFs, 0% for companies.
- **Indexation method** — available only for assets acquired **before 21 September
  1999**. The cost base is indexed by the change in the ABS Consumer Price Index
  (frozen at the September 1999 quarter), and no discount applies. InvestaLens
  computes both and uses whichever produces the **lower assessable gain**;
  indexation can never create or increase a loss.

The CGT and Unrealised CGT reports show a **Method** column indicating which was
applied per disposal, and an **Indexation Relief** figure when the indexation
method is used. CPI data is sourced from the Reserve Bank of Australia
(Statistical Table G1) — run `pnpm db:cpi` to load or refresh it.

### Bonds

- **Traditional (non-listed) bonds** are exempt from CGT. Any discount or premium
  realised on sale or at maturity is **ordinary income** (shown as _Bond Capital
  Growth_ in the Taxable Income report), declared in full with no CGT discount.
- **Listed and hybrid securities** (exchange-traded bonds, convertible notes,
  capital notes) remain subject to CGT.

By default an instrument's treatment is derived from its type (bonds → income,
everything else → CGT). Override it per instrument under **Settings → Instrument
Tax** (Auto / CGT / Income).

---

## Proposed 2027 CGT Regime (Projection)

> **Not yet law.** The _Treasury Laws Amendment (Tax Reform No. 1) Bill 2026_
> (introduced 28 May 2026) proposes major CGT changes from **1 July 2027**.
> InvestaLens models these as an **opt-in projection** for planning only.

Enable the projection with the **"Show proposed 2027 regime projection"** toggle
on the CGT report, and pick your income band so the 30% minimum tax can be
estimated. Configure entity type, transition method, residency, income-support
status and marginal rate under **Settings → Tax & CGT**.

What the projection models:

- **Indexation replaces the discount** for CGT events on/after 1 July 2027
  (individuals and trusts). Companies and super funds keep existing settings.
- **Deemed disposal at 1 July 2027** — straddle assets are split into a pre-2027
  component (existing law, incl. the 50% discount) and a post-2027 component
  (CPI-indexed), using either the **market value at 1 July 2027** or the
  **apportionment** (days-based) method.
- **Pre-CGT assets** (acquired before 20 September 1985) have their cost base
  reset to market value at 1 July 2027; pre-2027 growth stays exempt.
- **30% minimum tax** on the post-2027 ("minimum tax") gain, topping up to an
  effective 30% where the marginal rate is lower. Income-support recipients are
  exempt.
- **Asymmetric losses** — gains are indexed, losses are nominal, and capital
  losses are applied against discount/deferred gains first, then indexed gains.

> This is a simplified projection. It excludes formal valuations, part-year
> residency apportionment, tax offsets, and the full four-category method
> statement in the Bill. Always seek advice for your circumstances.

---

## Annual Tax Statement Components (AMIT)

At the end of the financial year, your fund manager will issue an Annual Tax Statement (also known as an AMMA or SDS statement). This breaks down yearly income into tax components such as Capital Gains and Foreign Income. Enter these totals so InvestaLens can attribute them to the correct tax year.

### Do You Have Trust Income?

You likely have trust income if you hold:

- **ETFs** — Almost all ASX-listed ETFs (e.g. Vanguard, BetaShares)
- **Managed Funds** — Both unlisted funds and "Active ETFs"
- **Stapled Securities** — Investments bundling a trust and company (e.g. Goodman Group, Scentre Group, Transurban)
- **Unit Trusts** — Property or infrastructure trusts

You do **NOT** have trust income if you hold:

- **Individual Shares** — Companies like CBA, BHP, or Woolworths
- **LICs (Listed Investment Companies)** — While they look like ETFs, companies like AFIC (AFI) or Argo (ARG) are legally companies that pay dividends, not trust distributions

**Rule of Thumb:** If you receive an Annual Tax Statement (AMMA or SDS statement) at the end of the year, you have trust income and need to complete this process.

### Cost Base Adjustments

When you hold an ETF, managed fund, or other trust investment, your annual tax statement may include components that adjust the cost base rather than contributing to taxable income for the year.

| Type                                   | Effect                                                   | Impact When Selling                                |
| -------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| AMIT Cost Base Increase                | Fund allocated more income than paid in cash             | Increases cost base → smaller capital gain on sale |
| AMIT Cost Base Decrease / Tax Deferred | Fund distributed more cash than taxable income allocated | Decreases cost base → larger capital gain on sale  |

Cost base adjustments do **not** appear in the CGT Report directly. They change the cost base over time — the impact shows up only when you sell the investment.

To see your adjusted cost base at any time, run the **Historical Cost Report** and check the Closing Balance column.

---

## Stapled Securities

### What Are Stapled Securities?

A stapled security is an investment product where two or more securities are legally bound together and cannot be bought or sold separately. In Australia, they typically consist of a unit in a managed investment trust (MIT) stapled to a share in a related company.

Most common in the property sector (A-REITs and infrastructure trusts). Common examples include:

- Goodman Group (GMG)
- GPT Group (GPT)
- APA Group (APA)
- Mirvac Group (MGR)
- Stockland (SGP)
- Transurban (TCL)
- Scentre Group (SCG)

### Tax Complexity

Although investors hold stapled securities as a single unit, each component carries distinct tax implications:

- **Separate cost bases** — Each component (trust unit and company share) has its own cost base for CGT
- **Mixed distribution types** — Payouts typically include both trust income and company dividends, taxed differently
- **Annual Tax Statement** — The trust component issues an Annual Tax Statement after 30 June, finalising tax components

### How InvestaLens Handles Stapled Securities

InvestaLens automatically classifies all distributions from stapled securities as trust income, ensuring they are correctly captured in the Taxable Income Report.

If your distribution contains both trust and non-trust components (e.g. a company dividend portion), you can edit individual distributions to split them accordingly.

> **Note:** InvestaLens does not automatically update AMIT tax components for stapled securities. You will need to manually enter these from your Annual Tax Statement each year.

---

## Foreign Exchange Rates and CGT

For holdings traded in a foreign currency, InvestaLens converts purchase and sale prices to AUD to calculate capital gains or losses.

### Which Exchange Rate Is Used?

InvestaLens applies rates in this order of priority:

1. **Broker-provided rate** — If your broker supplies an exchange rate via API integration or trade confirmation, that rate is used
2. **Open Exchange Rates** — If no broker rate is available, end-of-day market rates from Open Exchange Rates are used

### Acceptable Rates for ATO Reporting

The ATO does not mandate a single exchange rate. For CGT purposes on foreign share transactions, you may use:

- **Spot rate** — The actual rate at the time you converted funds
- **InvestaLens rate** — The end-of-day rate from Open Exchange Rates
- **ATO / RBA monthly rate** — Published at [ato.gov.au](https://www.ato.gov.au/Rates/Foreign-exchange-rates/)

### Is the ATO/RBA Rate Mandatory?

No. The ATO publishes monthly RBA rates as a convenience but does not require their use. You may use an alternative rate if it is a "reasonable approximation" from a "reliable external source."

There is no single "true" exchange rate — rates change constantly. The key is using a credible, consistent source.

### Overriding the Exchange Rate

You can manually override the exchange rate on any buy or sell trade. Edit the trade and enter your preferred rate in the Exchange Rate field — InvestaLens will recalculate CGT figures accordingly.

> **Note:** This is general information only and not tax or financial advice. If you are unsure which exchange rate to use for your tax return, consult a registered tax agent or accountant.

---

## Tax Planning Strategies

The Unrealised CGT Report is more than a snapshot — it's a tax planning tool. Here are common scenarios where it can inform your strategy.

### 1. Tax Loss Selling

**Situation:** You've sold (or plan to sell) a profitable investment and want to reduce your CGT liability.

Tax loss selling involves identifying holdings currently at a loss and selling them to offset capital gains, reducing your net taxable income.

**What to look at:** The losses table shows all positions with unrealised losses. Use these to identify candidates for tax loss selling before the end of the financial year.

### 2. Evaluating Which Parcels to Sell

**Situation:** You hold multiple parcels of the same stock acquired at different times and prices.

Each parcel has a different cost base and holding period — affecting CGT discount eligibility and tax owed.

**What to look at:** Compare short-term and long-term gains tables. Try changing the sale allocation method in Advanced Options to see how it affects total liability.

### 3. Drawing Down Your Portfolio Tax-Efficiently

**Situation:** You want to draw a regular amount from your portfolio and minimise the CGT triggered.

**What to look at:** Sort by estimated gain or tax liability to identify the least costly positions to sell first. Factor in holding period to see which positions qualify for the discount.

### 4. Retirement Planning

**Situation:** You're approaching retirement and building a drawdown strategy.

Use the report to model the tax impact of different liquidation sequences and pace sales to stay within lower tax brackets each year.

> **Note:** InvestaLens does not provide taxation advice. For complex retirement or estate planning scenarios, consult a qualified tax adviser or financial planner.

### 5. Rebalancing Without a Large Tax Hit

**Situation:** Your portfolio has drifted from target allocation and you want to rebalance without triggering a large CGT event.

**What to look at:** Cross-reference the Unrealised CGT Report with the Diversity Report and Exposure Report. Focus on positions in overweight sectors that appear in the losses table or have the lowest gain.

### 6. Division 296 Tax Planning (SMSF Investors)

**Situation:** Your Total Super Balance (TSB) across all funds exceeds $3 million.

Division 296 is an additional tax on super earnings:

- $3 million to $10 million: additional 15% tax on earnings
- Above $10 million: additional 25% tax on earnings

**One-time transitional opt-in (30 June 2026):** You can elect to reset asset values to market value at 30 June 2026, so only gains accruing after that date count for Division 296 purposes.

**What to look at:** Run the report at 30 June and review unrealised gains across all SMSF holdings. Share with your SMSF accountant as part of year-end planning.

> **Note:** InvestaLens does not calculate Division 296 tax. It is assessed by the ATO based on your total superannuation balance across all funds. Always consult a qualified tax adviser or SMSF specialist.

### Combining Tax Reports with Corporate Actions

Corporate actions such as mergers, demergers, and returns of capital directly affect your cost base and CGT calculations. See [ACTIONS.md](ACTIONS.md) for how to record these events correctly.

---

## Xero Integration

If you connect InvestaLens to Xero, the sale allocation method is used when calculating the realised gain component and cost base reduction on sell trades synchronised to Xero.

If the sale allocation method is altered after synchronising sell trades to Xero, you will be presented with an option to resynchronise affected transactions.

> **Note:** The total invoice value will not change, but the split between capital gain and the reduction of the asset cost base may be different.

---

## Related Documentation

| Document                                 | Description                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| [ACCOUNT.md](ACCOUNT.md)                 | Portfolio tax settings, tax entity type, and sale allocation method            |
| [TOOLS.md](TOOLS.md)                     | All reports including Historical Cost Report and All Trades Report             |
| [ACTIONS.md](ACTIONS.md)                 | Corporate actions affecting cost base (mergers, demergers, returns of capital) |
| [ASSETS.md](ASSETS.md)                   | Stapled securities, ETFs, and trust investments                                |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Setting up your portfolio with correct tax residency                           |
