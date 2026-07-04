# InvestaLens Tools & Reports

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Account Management](ACCOUNT.md) | Next: [Tax Reporting](TAX.md)

> **Implementation Status**
>
> | Feature                              | Status                                  |
> | ------------------------------------ | --------------------------------------- |
> | Performance Report (simple/nominal)  | ✅ Implemented                          |
> | Contribution Analysis                | ✅ Implemented                          |
> | Multi-Period Report                  | ✅ Implemented (`/reports/multi-period`) |
> | Sold Securities Report               | ✅ Implemented                          |
> | Future Income Report                 | ✅ Implemented                          |
> | Dividend Calendar                    | ✅ Implemented (`/reports/calendar`)    |
> | Diversity Report                     | ✅ Implemented                          |
> | Drawdown Risk Report                 | ✅ Implemented (`/reports/drawdown`)    |
> | Historical Cost Report               | ✅ Implemented (`/reports/historical-cost`) |
> | All Trades Report                    | ✅ Implemented                          |
> | Watchlist (single list, notes)       | ✅ Implemented                          |
> | Watchlist price alerts / multiple watchlists | ⏳ To be Implemented            |
> | Report export (CSV/PDF)              | ⏳ To be Implemented (PDF — R4)         |
> | Exposure Report (ETF X-ray)          | ✅ Implemented (R2)                     |
> | Share Checker                        | ✅ Implemented (R2)                     |
> | Market Sentiment                     | ✅ Implemented (R2)                     |
> | FIRE Calculator                      | ✅ Implemented (R2)                     |
> | Risk Analysis (X-ray)                | ✅ Implemented (R2)                     |
> | Multi-Currency Valuation             | ⏳ To be Implemented (R3)               |

## Overview

InvestaLens contains a number of powerful performance, asset allocation, and tax/compliance reports that you can run against your investment portfolio.

> **Note:** InvestaLens currently calculates returns as **simple, nominal** figures — capital gain + income, net of fees — indexed from the start of the selected period. They are **not** time-weighted or money-weighted (IRR), and **not** inflation-indexed. The per-portfolio Performance Method setting (simple vs compound) exists but is not currently used in calculations. True time-weighted / money-weighted returns are a planned enhancement — see [GAPS.md](GAPS.md).

Reports and tools fall into these categories:

- [Performance Reports](#performance-reports)
- [Asset Allocation Reports](#asset-allocation-reports)
- [Tax & Compliance Reports](#tax--compliance-reports)
- [Research Tools](#research-tools) — Share Checker, Watchlist, Market Sentiment
- [Planning Tools](#planning-tools) — FIRE Calculator
- [Risk Analysis (X-ray)](#risk-analysis-x-ray)

---

## Performance Reports

> Every report chart is **responsive and zoomable** — use the maximise button to open it full-screen — and uses the shared Rosely palette (with harmonised colours for transaction types and account categories where they apply).

### Performance Report

The Performance Report allows you to report on your portfolio performance over any date range. Holdings are organised in a table by a specified grouping (default is by market), with subtotals for each group and overall totals at the bottom.

**Key features:**

- Select any custom date range or use presets
- Group by: Market, Currency, Sector Classification, Industry Classification, Investment Type, Country, your Custom Groups (with an "Unassigned" bucket), or no grouping
- Filter by label to report on specific subsets of holdings
- Toggle between open positions only or open & closed positions (includes sales)
- Graph types: Percentage gain or Benchmarked (compare gain to a benchmark)
- Toggle between monetary gains (dollar values) and percentage gains (annualised return)

**How capital gain is calculated:**

- **Since inception** (or a start date on or before your purchase date): capital gain is calculated from your actual purchase price
- **Custom date range** starting after your purchase date: capital gain uses the market price on the start date, measuring performance within the selected period only

**Understanding annualised return:** The percentage shown is an annualised return — the rate of return per year, not the total gain as a percentage of cost. A holding with a large total gain held over many years can show a moderate annual percentage, while a small gain held briefly can show a very high annual percentage.

---

### Sold Securities Report

Shows performance of holdings that have been fully or partially sold, including realised capital gains and losses over a selected period.

---

### Future Income Report

Projects the **next expected payment for each holding** from its recent income history: for every holding with dividend, distribution, interest, or coupon transactions, the report infers the payment cadence and amount from the most recent payments and shows when the next one is likely to arrive and for how much.

**Key features:**

- One projected payment per holding, based on that holding's most recent income transactions
- Estimated payment date and amount, with a total of projected income across the portfolio

> **Note:** Projections are inferred from your recorded income history — they are indicative only and subject to change. Holdings without recent income transactions show no projection. A longer multi-month projection horizon and custom-group filtering are ⏳ planned — see [GAPS.md](GAPS.md).

---

### Calendar Report

View your dividend and income payments **month by month**: a monthly bar chart shows total income received in each month, with a table underneath listing each payment by month, instrument, and amount.

**Understanding the report:**

- **Monthly bar chart** — total income per month across the selected period
- **Payments table** — month, instrument, and amount for every income payment

> **⏳ Planned:** a day-grid calendar layout with per-day badges and payment-status dots is a possible future enhancement; the current report presents income by month.

---

### Contribution Analysis Report

Displays how each holding inside a portfolio contributes to overall portfolio performance.

**Understanding the columns:**

| Column         | Description                                                     |
| -------------- | ---------------------------------------------------------------- |
| Code           | The holding's ticker code                                        |
| Total Return   | The holding's total return (capital gain + income) over the period |
| Contribution % | The holding's share of overall portfolio performance             |

**How contribution % is calculated:**

```
Contribution % = Individual holding's total return ÷ Net portfolio return (signed)
```

The denominator is the portfolio's **signed** net return — the sum of all holdings' returns, gains netting off against losses. Because of this, individual contributions can exceed 100% or be negative (e.g. a losing holding in a portfolio with a net gain contributes a negative percentage), but they always sum to 100%.

---

### Multi-Currency Valuation Report ⏳ Not yet implemented

> **⏳ Planned (R3).** The description below covers the intended experience.

See the value of your holdings denominated in a foreign currency of your choice, on any past date since your portfolio's creation.

**Key features:**

- Support for 67+ currencies (including common cryptocurrencies)
- Select any historical date
- Group by Market, Currency, Sector, Industry, Investment Type, Country, or Custom Groups
- Shows: currency each investment is denominated in, price per unit, units held, value in investment currency, value in base currency, FX rate used, value in selected foreign currency

---

### Multi-Period Report

Compare portfolio performance across trailing time periods at a glance. The report shows percentage returns for the trailing **1 month, 3 months, 6 months, 1 year, and 3 years**, side by side.

> **⏳ Planned:** custom, cumulative, and per-financial-year period selection, plus grouping with subtotals — see [GAPS.md](GAPS.md).

---

## Asset Allocation Reports

### Diversity Report

Shows the individual weighting in a portfolio or across various groupings at a chosen point in time.

**Key features:**

- Visual pie chart representation of portfolio diversity
- Detailed breakdown by holding in a table below the chart
- Select any historical date
- Group by: Market, Currency, Sector Classification, Industry Classification, Investment Type, Country, your Custom Groups (with an "Unassigned" bucket), or no grouping (Holdings)
- Click any column heading to reorder the table

---

### Exposure Report

Shows the underlying holdings within your ETFs (Exchange Traded Funds), revealing the true composition of your investments. If you own multiple ETFs, it identifies overlapping holdings, giving you a clear picture of overall exposure alongside your direct investments.

**Key features:**

- Works on consolidated portfolios for a bird's-eye view across all investments
- Look-through data is currently built in for **five popular Australian ETFs**: VAS, IOZ, STW, VGS, and VDHG
- Direct holdings and the covered ETFs' underlying exposures are combined into one view

> **⏳ Planned:** broader look-through coverage (more ETFs, more markets, deeper holding lists) — see [GAPS.md](GAPS.md).

**Report elements:**

| Element             | Description                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| Pie Chart           | Graphical representation of exposure based on selected grouping                      |
| Holdings List       | Full list of direct and underlying holdings                                          |
| Ownership Indicator | Whether a holding is owned directly, via an ETF (underlying), or nested              |
| Exposure %          | Each stock's exposure as a percentage of total portfolio value (direct + underlying) |
| Value               | Current portfolio value attributed to the holding (direct + indirect)                |
| Arrow Indicator     | Expand to see breakdown of direct vs underlying exposure for each holding            |

**Why it matters:** Understanding underlying asset exposure is critical for risk management and portfolio diversification. Many investors assume their ETFs are more diversified than they are — the Exposure Report surfaces hidden concentrations, such as heavy overlap between ETFs or unexpected overweighting in a single stock, sector, or country.

**Common use cases:**

- Avoid over-concentration when holding both direct stocks and ETFs
- Understand combined weighting of a stock held directly and within multiple ETFs
- Identify over-exposure to specific stocks (e.g. AAPL, FAANG) or markets (e.g. US)
- Uncover hidden investments you didn't know you held via ETFs
- Reduce overlap between ETFs to improve diversification and reduce fees

---

### Drawdown Risk Report

Provides a comprehensive analysis of your portfolio by comparing each investment's performance to its maximum drawdown (MDD) over a specified period. Helps understand current portfolio construction and inform rebalancing decisions.

**Key metrics:**

#### Maximum Drawdown (MDD)

The largest observed loss from a peak to a trough before reaching a new peak, expressed as a percentage:

```
MDD = (Trough Value − Peak Value) ÷ Peak Value
```

MDD is a backward-looking metric measuring downside risk. It does not predict future results and should not be the sole measure for evaluating portfolio performance.

#### Return Over Maximum Drawdown (RoMaD)

A risk-adjusted performance metric that maximises returns while minimising MDD:

```
RoMaD = Portfolio Return ÷ Maximum Drawdown
```

A RoMaD value above 1 suggests the portfolio achieved a return greater than its worst drawdown.

**Graph interpretation (four quadrants):**

| Quadrant    | Risk | Return | Interpretation                                    |
| ----------- | ---- | ------ | ------------------------------------------------- |
| Upper Left  | Low  | High   | Most favourable — low drawdown risk, high returns |
| Lower Left  | Low  | Low    | Stable — provides stability and hedging           |
| Upper Right | High | High   | Growth stocks — high return potential, high risk  |
| Lower Right | High | Low    | Least desirable — high risk, poor performance     |

**Additional features:**

- Summary table with value, total return, MDD %, and RoMaD for each investment

**Limitations:** Does not account for overall volatility, frequency of losses, recovery speed, or duration of drawdowns. Excludes custom investments, cryptocurrencies, and FX assets. Results are sensitive to the chosen time period.

---

## Tax & Compliance Reports

### Taxable Income Report

Dividend income broken out by franked, unfranked, and foreign components for the selected financial year. For full column descriptions and ATO mapping, see [TAX.md](TAX.md#taxable-income-report).

---

### Capital Gains Tax (CGT) Report

Shows realised gains and losses from holdings sold during the selected period, calculated per ATO rules. Includes CGT discount application based on tax entity type. For detailed breakdown tabs, locking, and sale allocation methods, see [TAX.md](TAX.md#capital-gains-tax-cgt-report).

---

### Unrealised CGT Report

Model net gains from selling current positions for tax loss harvesting. Compare CGT sale allocation methods (FIFO, LIFO, specific identification) to optimise tax outcomes. For tax planning strategies using this report, see [TAX.md](TAX.md#unrealised-cgt-report).

---

### Historical Cost Report

Shows opening and closing balances at cost price. Designed for entities (companies, trusts) required to prepare annual accounts. Includes market value columns for quick comparison.

**Report columns:**

| Column               | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Opening Balance      | Cost base carried forward to the start date (cumulative cost net of prior sales and adjustments) |
| Opening Market Value | Market value at start of report period                                                           |
| Opening Quantity     | Units held at start date                                                                         |
| Purchases            | Cost of shares purchased during the period                                                       |
| Cost of Sales        | Original buy value of shares sold (determined by sale allocation method)                         |
| Capital Adjustments  | Cost base adjustments (e.g. AMIT increases/decreases from trust distributions)                   |
| Closing Balance      | Cost base at end of period: Opening Balance + Purchases − Cost of Sales ± Capital Adjustments    |
| Closing Market Value | Market value at end of report period                                                             |
| Closing Quantity     | Units held at end date                                                                           |

**Options:**

- Date range selection (default: current tax year)
- Group by any preset or custom grouping
- Toggle to include/exclude brokerage in asset cost

---

### All Trades Report

Complete list of all buy and sell transactions for the selected financial year.

---

## Research Tools

### Share Checker — Portfolio Health Checks

The Share Checker (`/tools/checker`) runs an automated **health check** over a portfolio (or a model portfolio), flagging structural issues before they bite.

**What it checks:**

| Check | What it flags |
| ----- | ------------- |
| **Concentration** | Any single holding exceeding **20%** of the portfolio |
| **Stale prices** | Holdings whose latest price is **older than 5 business days** |
| **Missing cost base** | Holdings without buy transactions to establish a cost base |
| **Duplicates** | The same instrument held across multiple portfolios |
| **Model health** | In model mode: constituent data-quality and time-period validity checks, summarised in a green/amber/red health badge |

**How to use:**

1. Navigate to **Tools → Share Checker**
2. Select a portfolio (or switch to model mode and select a model)
3. Review the findings — each is shown with a severity badge (error / warning / info) and a fix suggestion

---

### Watchlist

Track assets you're interested in without adding them to your portfolio. The Watchlist lets you monitor price movements, news, and performance of potential investments before committing capital.

**Key features:**

- Add any supported security (stocks, ETFs, crypto, funds) by ticker or name
- A single watchlist per account
- Notes field for recording research and investment thesis

**Watchlist columns:**

| Column | Description                  |
| ------ | ---------------------------- |
| Code   | Ticker code                  |
| Name   | Company or fund name         |
| Market | Exchange / market code       |
| Notes  | Your personal research notes |

> **⏳ Planned:** price alerts (above/below threshold) and multiple watchlists — see [GAPS.md](GAPS.md).

---

### Market Sentiment Indicators

Monitor broad market conditions and investor sentiment to contextualise your portfolio's performance.

**Available indicators:**

| Indicator              | Description                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| Fear & Greed Index     | 0–100 gauge derived **linearly from the VIX** (higher VIX → more fear) |
| VIX (Volatility Index) | Expected 30-day market volatility from S&P 500 options               |
| ASX summary            | Snapshot of the Australian market                                    |
| Sector heatmap         | Sector performance via sector-ETF proxies                            |

**Sentiment scale:**

| Range  | Interpretation | Typical Action                            |
| ------ | -------------- | ----------------------------------------- |
| 0–25   | Extreme Fear   | Potential buying opportunity (contrarian) |
| 25–45  | Fear           | Market caution, watch for entry points    |
| 45–55  | Neutral        | Balanced sentiment                        |
| 55–75  | Greed          | Consider taking profits                   |
| 75–100 | Extreme Greed  | Elevated risk of correction               |

> **Note:** Sentiment indicators are informational only and should not be used as the sole basis for investment decisions.

---

## Planning Tools

### FIRE Calculator (Financial Independence, Retire Early)

Model your path to financial independence by projecting when your portfolio will sustain your desired lifestyle without employment income.

**Input parameters:**

| Parameter                | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| Current portfolio value  | Total investment assets today                                   |
| Annual contributions     | How much you invest each year                                   |
| Expected return (%)      | Assumed annual portfolio return (real, after inflation)         |
| Annual expenses          | Your target annual spending in retirement                       |
| Safe withdrawal rate (%) | Percentage of portfolio you plan to draw annually (default: 4%) |
| Current age              | Your age today                                                  |
| Target retirement age    | When you'd like to achieve financial independence               |

**Outputs:**

- **FIRE number** — The portfolio size needed to sustain your expenses indefinitely: `Annual Expenses ÷ Safe Withdrawal Rate`
- **Years to FIRE** — How long until your portfolio reaches the FIRE number at your current savings rate
- **Projected FIRE age** — Your age when financial independence is reached
- **Progress bar** — Visual indicator showing % of FIRE number achieved
- **Projection chart** — Year-by-year portfolio growth projection with milestones
- **Sensitivity analysis** — How changes in return rate, contribution, or withdrawal rate shift the timeline

**FIRE variants:**

| Variant      | Description                                                  | Withdrawal Rate |
| ------------ | ------------------------------------------------------------ | --------------- |
| Lean FIRE    | Minimal lifestyle, lower expenses                            | 4%              |
| Regular FIRE | Comfortable lifestyle matching current spending              | 4%              |
| Fat FIRE     | Generous lifestyle with buffer                               | 3–3.5%          |
| Barista FIRE | Partial FIRE with part-time income supplementing withdrawals | 2–3% + income   |

**How it runs:**

The FIRE Calculator is **fully client-side** — every input above is entered manually and results update instantly as you type. It does not read your portfolio data. _(Pre-filling the current portfolio value and historical returns from your actual holdings is a ⏳ possible future enhancement.)_

> **Note:** Projections are estimates based on assumed constant returns. Actual results will vary due to market volatility, inflation, and life changes. This is not financial advice.

---

## Risk Analysis (X-ray)

The X-ray health check is the **Share Checker** tool at `/tools/checker` — a static analysis of your portfolio identifying potential risks and structural weaknesses without running individual reports.

### What It Checks

| Category              | What It Checks                                                    |
| --------------------- | ------------------------------------------------------------------ |
| **Concentration**     | Single holdings exceeding **20%** of the portfolio                  |
| **Stale prices**      | Holdings whose latest price is older than **5 business days**       |
| **Missing cost base** | Holdings without buy transactions to establish a cost base          |
| **Duplicates**        | The same instrument held across multiple portfolios                 |
| **Model health**      | Model-mode data-quality and validity checks with a health badge     |

For ETF overlap analysis, use the **Exposure Report** at `/analytics/exposure`.

### Alert Severities

| Severity   | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| 🔴 Error   | Immediate attention recommended — significant issue identified |
| 🟡 Warning | Potential issue — review when convenient                      |
| 🟢 Info    | Observation only — no action required                         |

### Running the Check

1. Navigate to **Tools → Share Checker**
2. Select the portfolio (or a model)
3. Review the findings and their fix suggestions

> **Note:** This is a static analysis tool based on current positions. It does not predict future performance or guarantee that identified risks will materialise. _(Configurable thresholds are ⏳ a possible future enhancement — the current thresholds are fixed.)_

---

## Model Portfolios

**Model portfolios** are virtual, weight-based target portfolios (a set of instruments with target weights summing to 100%) that you compare against your real, consolidated portfolio. They are managed from the sidebar **Models** item and surface across several tools and reports.

| Surface | Where | What it does |
| --- | --- | --- |
| **Models dashboard** | `/models` | Scaled comparison of your consolidated portfolio vs selected models, with a range selector and per-series stat cards (total return, CAGR, max drawdown, volatility) |
| **Model detail** | `/models/[id]` | Target-weight pie, instantiation table (whole units + residual cash), value-over-time, ETF look-through, and a green/amber/red health badge |
| **Rebalancing & Drift** | Tools → Rebalancing & Drift | Pick a portfolio + target model; see target vs actual weights, the drift (Δ), and the buy/sell deltas (value and units) to realign |
| **Model Comparison report** | Reports → Model Comparison | "How would my money have performed in model X vs my actual portfolio?" — scaled value curves + metrics |
| **Share Checker (model mode)** | Tools → Share Checker | Runs concentration / data-quality checks plus the time-period validity check over a model's weights, with a health badge |
| **Rebalance-to-model CGT** | Tax → Unrealised CGT | Estimates the sells and CGT to move a real portfolio to a model's target weights |

Model portfolios also act as a **source** for Optimise, Backtest, Correlations, Factor Analysis, Efficient Frontier, Stress Testing, Black-Litterman and What-If — see [ADVANCED.md](ADVANCED.md#model-portfolios).

---

## Common Report Features

### Grouping Options

Most reports support grouping holdings by:

- Market
- Currency
- Sector Classification
- Industry Classification
- Investment Type
- Country
- No grouping (individual holdings)
- Custom Groups — organise holdings by your own specifications

### Labels

Filter reports to specific subsets of holdings using labels. Useful for comparing performance across different categories (e.g. holdings recommended by different advisors).

### Export Options

Reports are viewed on screen. Your underlying data (trades, holdings, dividends, full JSON backup) can be exported at any time via **Settings → Export**.

> **⏳ Planned (R4):** per-report PDF export. See [GAPS.md](GAPS.md).

### Consolidated View

Run reports across multiple portfolios for a complete picture of all investments and tax entities in one place. See [ACCOUNT.md](ACCOUNT.md#consolidated-view) for setup.

---

## Related Documentation

| Document                                 | Description                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| [TAX.md](TAX.md)                         | Comprehensive tax reporting — CGT, taxable income, AMIT, and tax planning |
| [ACCOUNT.md](ACCOUNT.md)                 | Custom groups, labels, portfolio sharing, and consolidated views          |
| [ASSETS.md](ASSETS.md)                   | Supported asset types and stock exchanges                                 |
| [ACTIONS.md](ACTIONS.md)                 | Corporate actions and how they affect holdings                            |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Portfolio setup and importing investments                                 |
| [API.md](API.md)                         | Programmatic access to reports and data                                   |
| [ADVANCED.md](ADVANCED.md)               | Backtesting, Monte Carlo simulation, optimisation, and factor analysis    |
