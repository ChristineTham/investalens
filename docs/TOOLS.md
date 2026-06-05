# InvestaLens Tools & Reports

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Account Management](ACCOUNT.md) | Next: [Tax Reporting](TAX.md)

## Overview

InvestaLens contains a number of powerful performance, asset allocation, and tax/compliance reports that you can run against your investment portfolio.

> **Note:** InvestaLens calculates percentage returns using a money-weighted return methodology (taking account of the size and timing of cash flows).

Reports and tools fall into these categories:

- [Performance Reports](#performance-reports)
- [Asset Allocation Reports](#asset-allocation-reports)
- [Tax & Compliance Reports](#tax--compliance-reports)
- [Research Tools](#research-tools) — Share Checker, Watchlist, Market Sentiment
- [Planning Tools](#planning-tools) — FIRE Calculator
- [Risk Analysis (X-ray)](#risk-analysis-x-ray)

---

## Performance Reports

### Performance Report

The Performance Report allows you to report on your portfolio performance over any date range. Holdings are organised in a table by a specified grouping (default is by market), with subtotals for each group and overall totals at the bottom.

**Key features:**

- Select any custom date range or use presets
- Group by: Market, Currency, Sector Classification, Industry Classification, Investment Type, Country, Custom Groups, or no grouping
- Filter by labels to report on specific subsets of holdings
- Toggle between open positions only or open & closed positions (includes sales)
- Graph types: Percentage gain or Benchmarked (compare gain to a benchmark)
- Toggle between monetary gains (dollar values) and percentage gains (annualised return)
- Export to PDF, CSV, or spreadsheet

**How capital gain is calculated:**

- **Since inception** (or a start date on or before your purchase date): capital gain is calculated from your actual purchase price
- **Custom date range** starting after your purchase date: capital gain uses the market price on the start date, measuring performance within the selected period only

**Understanding annualised return:** The percentage shown is an annualised return — the rate of return per year, not the total gain as a percentage of cost. A holding with a large total gain held over many years can show a moderate annual percentage, while a small gain held briefly can show a very high annual percentage.

---

### Sold Securities Report

Shows performance of holdings that have been fully or partially sold, including realised capital gains and losses over a selected period.

---

### Future Income Report

Lists paid, announced, and estimated dividend and interest payments. The report is calculated based on current portfolio positions and available data.

**Key features:**

- Run up to 36 months into the future (default: current date to 12 months ahead)
- Back-date to include past payments
- View payments individually or as monthly totals
- Group and filter using Custom Groups and Labels
- Customisable table display — select/deselect columns and rearrange order

**Payment statuses:**

| Status | Description |
|--------|-------------|
| Announced | Payment officially declared by the issuer but not yet processed |
| Pending Payment | Ex-date has passed, confirming eligibility, awaiting distribution |
| Paid (Unconfirmed) | Payment recorded as issued but not yet confirmed as received |
| Paid (Confirmed) | Payment successfully received and verified in your portfolio |
| Estimated | Projection based on currently available information, subject to change |

> **Note:** Estimated data may be incomplete and is subject to change up until the dividend ex-date. The report is indicative only.

---

### Calendar Report

View your dividends month-by-month in a standard calendar layout and see exactly what income is coming up next. Designed to help you easily track payments and confirm them as they arrive.

**Understanding the calendar view:**

- **Daily Income**: A currency badge on a date shows the total dividend income expected or received for that day
- **Holding Details**: Ticker and market code appear below the amount, showing which holding is paying
- **Status Colours**: Coloured dots denote payment status (Paid, Pending, Announced, Estimated)
- **Daily Breakdown**: Click any date to see a detailed breakdown of every individual payment

**Filters:** Filter by payment status — Paid, Pending, Announced, or Estimated.

---

### Contribution Analysis Report

Displays how each holding inside a portfolio contributes to overall portfolio performance. For each holding, view capital gains, total return, dividends, and currency gains in both dollar and percentage terms.

**Key features:**

- Date range selection
- Group by any preset or custom grouping
- Filter by label
- Optional contribution analysis bar chart
- Include or exclude closed positions
- Export to PDF, CSV, or spreadsheet

**Understanding the columns:**

| Column | Description |
|--------|-------------|
| Capital Gains | Change in market value (unrealised + realised gains/losses) over the period |
| Dividends | Total dividends and distributions received during the period, including franking credits |
| Currency Gains | FX impact on foreign-denominated holdings when exchange rates move |
| Total Return | Sum of capital gains, dividends, and currency gains |
| Contribution % | How much each holding drove overall portfolio performance |

**How contribution % is calculated:**

```
Contribution % = Individual holding's total return ÷ Sum of absolute returns of all holdings
```

The denominator sums every holding's total return as a positive number, regardless of whether it made or lost money. Contributions across all holdings will not always add up to 100% — a portfolio with both gains and losses will sum to less than 100%.

---

### Multi-Currency Valuation Report

See the value of your holdings denominated in a foreign currency of your choice, on any past date since your portfolio's creation.

**Key features:**

- Support for 67+ currencies (including common cryptocurrencies)
- Select any historical date
- Group by Market, Currency, Sector, Industry, Investment Type, Country, or Custom Groups
- Shows: currency each investment is denominated in, price per unit, units held, value in investment currency, value in base currency, FX rate used, value in selected foreign currency

---

### Multi-Period Report

Calculate portfolio performance across multiple distinct or cumulative time periods. Compare up to 5 periods:

- Financial years
- Calendar years
- Quarterly (calendar quarters)
- Monthly
- Weekly
- Custom periods

**Key features:**

- Group holdings by preset or custom groupings with subtotals
- Compare total return, capital gain, payout gain (dividends), or currency gain
- Toggle between monetary and percentage gains
- Bar graph visualisation of performance across periods

**Cumulative vs distinct periods:**

- **Cumulative periods**: Contextualise performance — e.g. most recent quarter compared with previous 3 quarters, or last 6 months vs previous 12 months. Useful for rolling returns and benchmarking.
- **Distinct periods**: Assess how your portfolio has performed compared with past periods at an intrinsic level, leading to opportunities to reassess and rebalance.

---

## Asset Allocation Reports

### Diversity Report

Shows the individual weighting in a portfolio or across various groupings at a chosen point in time.

**Key features:**

- Visual pie chart representation of portfolio diversity
- Detailed breakdown by holding in a table below the chart
- Select any historical date
- Group by: Market, Currency, Sector Classification, Industry Classification, Investment Type, Country, Custom Groups, or no grouping (Holdings)
- Click any column heading to reorder the table
- Export to PDF, CSV, or spreadsheet

---

### Exposure Report

Shows the underlying holdings within your ETFs (Exchange Traded Funds), revealing the true composition of your investments. If you own multiple ETFs, it identifies overlapping holdings, giving you a clear picture of overall exposure alongside your direct investments.

**Key features:**

- Works on consolidated portfolios for a bird's-eye view across all investments
- Covers ETFs listed in AU, CA, NZ, UK, USA, and EU markets
- Shows top 50–500 underlying holdings per ETF
- Group by: Market, Currency, Sector Classification, Industry Classification, Investment Type, Country, or no grouping

**Report elements:**

| Element | Description |
|---------|-------------|
| Pie Chart | Graphical representation of exposure based on selected grouping |
| Holdings List | Full list of direct and underlying holdings |
| Ownership Indicator | Whether a holding is owned directly, via an ETF (underlying), or nested |
| Exposure % | Each stock's exposure as a percentage of total portfolio value (direct + underlying) |
| Value | Current portfolio value attributed to the holding (direct + indirect) |
| Arrow Indicator | Expand to see breakdown of direct vs underlying exposure for each holding |
| Residual ETFs | Holdings beyond the display limit grouped under "Residual ETF" |

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

| Quadrant | Risk | Return | Interpretation |
|----------|------|--------|----------------|
| Upper Left | Low | High | Most favourable — low drawdown risk, high returns |
| Lower Left | Low | Low | Stable — provides stability and hedging |
| Upper Right | High | High | Growth stocks — high return potential, high risk |
| Lower Right | High | Low | Least desirable — high risk, poor performance |

**Additional features:**

- Interactive legend — click to include/exclude investments or categories
- Zoom — click and drag to zoom into clustered areas
- Summary table with value, total return, MDD %, and RoMaD for each investment
- Group by any preset or custom grouping
- Export to PDF, CSV, or spreadsheet

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

| Column | Description |
|--------|-------------|
| Opening Balance | Cost base carried forward to the start date (cumulative cost net of prior sales and adjustments) |
| Opening Market Value | Market value at start of report period |
| Opening Quantity | Units held at start date |
| Purchases | Cost of shares purchased during the period |
| Cost of Sales | Original buy value of shares sold (determined by sale allocation method) |
| Capital Adjustments | Cost base adjustments (e.g. AMIT increases/decreases from trust distributions) |
| Closing Balance | Cost base at end of period: Opening Balance + Purchases − Cost of Sales ± Capital Adjustments |
| Closing Market Value | Market value at end of report period |
| Closing Quantity | Units held at end date |

**Options:**

- Date range selection (default: current tax year)
- Group by any preset or custom grouping
- Toggle to include/exclude brokerage in asset cost

---

### All Trades Report

Complete list of all buy and sell transactions for the selected financial year.

---

## Research Tools

### Share Checker — Compare Hypothetical Investments

Check the performance of a hypothetical investment of $10,000 in any share, ETF, or mutual fund within a selected date range.

**How to use:**

1. Select the stock market the holding is listed on
2. Type in the holding code or name and select from results
3. Select the performance calculation method
4. Select the date range
5. Click Go

**The Share Checker displays:**

- Performance graph
- Holding details and current share price
- Performance summary — summary of $10,000 hypothetically invested at the start of the date range
- Trades & adjustments — the hypothetical buy trade and any adjustments within the period
- Dividends that would have been received
- Corporate actions that occurred within the date range
- News on the holding

---

### Watchlist

Track assets you're interested in without adding them to your portfolio. The Watchlist lets you monitor price movements, news, and performance of potential investments before committing capital.

**Key features:**

- Add any supported security (stocks, ETFs, crypto, funds) by ticker or name
- View current price, daily change, and performance over selectable periods
- Quick-add to portfolio when ready to buy
- Set price alerts (above/below threshold) with email or in-app notifications
- Notes field for recording research and investment thesis
- Organise into multiple watchlists (e.g. "Growth candidates", "Income plays")

**Watchlist columns:**

| Column | Description |
|--------|-------------|
| Symbol | Ticker and exchange |
| Name | Company or fund name |
| Price | Current or last closing price |
| Change (%) | Daily price movement |
| 1W / 1M / YTD / 1Y | Period performance |
| Market Cap | Current market capitalisation |
| Dividend Yield | Trailing 12-month yield |
| Notes | Your personal research notes |

---

### Market Sentiment Indicators

Monitor broad market conditions and investor sentiment to contextualise your portfolio's performance.

**Available indicators:**

| Indicator | Description | Source |
|-----------|-------------|--------|
| Fear & Greed Index | Composite measure of market emotion (0–100 scale) | CNN Business methodology |
| VIX (Volatility Index) | Expected 30-day market volatility from S&P 500 options | CBOE |
| Put/Call Ratio | Ratio of put options to call options traded | Market data |
| Market Breadth | % of stocks above 200-day moving average | Exchange data |
| Yield Curve | Spread between 10-year and 2-year government bonds | Reserve Bank / Treasury |

**Sentiment scale:**

| Range | Interpretation | Typical Action |
|-------|---------------|----------------|
| 0–25 | Extreme Fear | Potential buying opportunity (contrarian) |
| 25–45 | Fear | Market caution, watch for entry points |
| 45–55 | Neutral | Balanced sentiment |
| 55–75 | Greed | Consider taking profits |
| 75–100 | Extreme Greed | Elevated risk of correction |

> **Note:** Sentiment indicators are informational only and should not be used as the sole basis for investment decisions.

---

## Planning Tools

### FIRE Calculator (Financial Independence, Retire Early)

Model your path to financial independence by projecting when your portfolio will sustain your desired lifestyle without employment income.

**Input parameters:**

| Parameter | Description |
|-----------|-------------|
| Current portfolio value | Total investment assets today |
| Annual contributions | How much you invest each year |
| Expected return (%) | Assumed annual portfolio return (real, after inflation) |
| Annual expenses | Your target annual spending in retirement |
| Safe withdrawal rate (%) | Percentage of portfolio you plan to draw annually (default: 4%) |
| Current age | Your age today |
| Target retirement age | When you'd like to achieve financial independence |

**Outputs:**

- **FIRE number** — The portfolio size needed to sustain your expenses indefinitely: `Annual Expenses ÷ Safe Withdrawal Rate`
- **Years to FIRE** — How long until your portfolio reaches the FIRE number at your current savings rate
- **Projected FIRE age** — Your age when financial independence is reached
- **Progress bar** — Visual indicator showing % of FIRE number achieved
- **Projection chart** — Year-by-year portfolio growth projection with milestones
- **Sensitivity analysis** — How changes in return rate, contribution, or withdrawal rate shift the timeline

**FIRE variants:**

| Variant | Description | Withdrawal Rate |
|---------|-------------|------------------|
| Lean FIRE | Minimal lifestyle, lower expenses | 4% |
| Regular FIRE | Comfortable lifestyle matching current spending | 4% |
| Fat FIRE | Generous lifestyle with buffer | 3–3.5% |
| Barista FIRE | Partial FIRE with part-time income supplementing withdrawals | 2–3% + income |

**Integration with your portfolio:**

- Pre-fills current portfolio value from your actual holdings
- Uses your actual historical return as a baseline assumption
- Factors in your recorded dividend income as part of the withdrawal stream
- Models tax impact using your portfolio's tax entity settings (see [TAX.md](TAX.md))

> **Note:** Projections are estimates based on assumed constant returns. Actual results will vary due to market volatility, inflation, and life changes. This is not financial advice.

---

## Risk Analysis (X-ray)

The X-ray tool performs a static analysis of your portfolio to identify potential risks, concentration issues, and structural weaknesses — without needing to run individual reports.

### How It Works

X-ray scans your portfolio and generates alerts across multiple risk dimensions. Each finding is categorised by severity.

### Risk Categories

| Category | What It Checks |
|----------|---------------|
| **Concentration** | Single holdings exceeding a threshold (default: 10% of portfolio) |
| **Sector Overweight** | Any sector exceeding a threshold (default: 30%) |
| **Country Exposure** | Over-reliance on a single country/market |
| **Currency Risk** | Unhedged foreign currency exposure above threshold |
| **ETF Overlap** | Holdings duplicated across multiple ETFs (uses Exposure Report data) |
| **Liquidity** | Holdings with low trading volume or wide bid-ask spreads |
| **Dividend Dependency** | Income concentration — single holdings providing >25% of portfolio income |
| **Drawdown Vulnerability** | Holdings with historical MDD exceeding threshold |
| **Correlation** | Highly correlated holdings that don't provide diversification |
| **Missing Data** | Holdings without recent price updates or incomplete cost base |

### Alert Severities

| Severity | Meaning |
|----------|--------|
| 🔴 Critical | Immediate attention recommended — significant risk identified |
| 🟡 Warning | Potential issue — review when convenient |
| 🟢 Info | Observation only — no action required |

### Configuring Thresholds

Customise alert thresholds via **Settings > Risk Preferences**:

- Max single holding weight: 5–25% (default: 10%)
- Max sector weight: 20–50% (default: 30%)
- Max country weight: 30–70% (default: 50%)
- Max currency exposure: 20–80% (default: 50%)
- Correlation threshold: 0.7–0.95 (default: 0.8)

### Running X-ray

1. Navigate to **Tools > X-ray**
2. Select the portfolio (or consolidated view)
3. Review the findings, grouped by category
4. Click any alert for details and actionable suggestions

> **Note:** X-ray is a static analysis tool based on current positions. It does not predict future performance or guarantee that identified risks will materialise.

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

All reports can be exported to:

- PDF
- CSV/Spreadsheet
- Google Drive

### Consolidated View

Run reports across multiple portfolios for a complete picture of all investments and tax entities in one place. See [ACCOUNT.md](ACCOUNT.md#consolidated-view) for setup.

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [TAX.md](TAX.md) | Comprehensive tax reporting — CGT, taxable income, AMIT, and tax planning |
| [ACCOUNT.md](ACCOUNT.md) | Custom groups, labels, portfolio sharing, and consolidated views |
| [ASSETS.md](ASSETS.md) | Supported asset types and stock exchanges |
| [ACTIONS.md](ACTIONS.md) | Corporate actions and how they affect holdings |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Portfolio setup and importing investments |
| [API.md](API.md) | Programmatic access to reports and data |
| [ADVANCED.md](ADVANCED.md) | Backtesting, Monte Carlo simulation, optimisation, and factor analysis |
