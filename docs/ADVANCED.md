# InvestaLens Advanced Analytics

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Corporate Actions](ACTIONS.md) | Next: [API Reference](API.md)

> **Implementation Status (R2 Analytics)**
>
> | Feature                                 | Status                    |
> | --------------------------------------- | ------------------------- |
> | Portfolio Backtesting                   | ✅ Implemented (R2)       |
> | Monte Carlo Simulation                  | ✅ Implemented (R2)       |
> | Portfolio Optimisation (mean-variance, HRP, risk parity) | ✅ Implemented (R2) |
> | Efficient Frontier                      | ✅ Implemented (R2)       |
> | Black-Litterman Model                   | ✅ Implemented (R2)       |
> | Estimation Methods                      | ✅ Implemented (R2)       |
> | Model Validation & Selection            | ✅ Implemented (R2)       |
> | Factor Analysis                         | ✅ Implemented (R2)       |
> | Tactical Asset Allocation               | ✅ Implemented (R2)       |
> | Scenario & Stress Testing               | ✅ Implemented (R2)       |
> | Capital Market Expectations             | ⏳ To be Implemented      |
>
> _The R2 analytics suite is implemented via the Python analytics backend (`api/analytics/`) and the `/analytics` pages. Capital Market Expectations as a standalone tool is still outstanding — see [GAPS.md](GAPS.md)._

## Overview

InvestaLens includes a suite of advanced analytical tools for portfolio construction, backtesting, simulation, and factor analysis. These tools go beyond tracking and reporting — they help you make forward-looking investment decisions backed by quantitative analysis.

> **Note:** Advanced analytics tools use historical data and mathematical models. Past performance does not predict future results. These tools are for research and education purposes and do not constitute financial advice.

**Jump to:**

- [Portfolio Backtesting](#portfolio-backtesting)
- [Monte Carlo Simulation](#monte-carlo-simulation)
- [Portfolio Optimisation](#portfolio-optimisation)
- [Efficient Frontier](#efficient-frontier)
- [Black-Litterman Model](#black-litterman-model)
- [Model Portfolios](#model-portfolios)
- [Estimation Methods](#estimation-methods)
- [Model Validation & Selection](#model-validation--selection)
- [Factor Analysis](#factor-analysis)
- [Tactical Asset Allocation](#tactical-asset-allocation)
- [Asset Correlations](#asset-correlations)
- [Scenario & Stress Testing](#scenario--stress-testing)
- [Capital Market Expectations](#capital-market-expectations)

---

## Portfolio Backtesting

Test how a hypothetical allocation strategy would have performed over the historical returns of your holdings. The backtester runs a **walk-forward** simulation over the supplied return history, re-computing weights at each rebalance.

### Strategies

| Strategy          | Description                                        |
| ----------------- | --------------------------------------------------- |
| **Equal Weight**  | 1/N across all assets                               |
| **Min Variance**  | Minimise portfolio volatility                       |
| **Max Sharpe**    | Maximise risk-adjusted return                       |
| **Risk Parity**   | Equalise the risk contribution of each asset        |
| **Mean-Variance** | Classic Markowitz optimisation                      |

### Configuration

| Parameter   | Options                                                       |
| ----------- | -------------------------------------------------------------- |
| Source      | A real portfolio or a [model portfolio](#model-portfolios); compare a mix of both |
| Rebalancing | Monthly, quarterly, or annually                                 |
| Benchmark   | ASX 200, S&P 500, MSCI World, and ETF proxies                   |

### Output Metrics

- CAGR, Sharpe, Sortino, maximum drawdown, Calmar ratio
- Equity curve and drawdown chart
- Side-by-side strategy comparison (`/analytics/backtest/compare`)

> **Note:** Backtests run over the price history available for your holdings — there is no built-in pre-1990s asset-class dataset, and periodic contribution/withdrawal cashflows, inflation adjustment, and safe-withdrawal-rate statistics are not modelled.

---

## Monte Carlo Simulation

Project the probability of different portfolio outcomes by running thousands of randomised return scenarios. Essential for retirement planning, withdrawal sustainability testing, and goal probability analysis.

### Simulation Methods

| Method         | Description                                                             |
| -------------- | ------------------------------------------------------------------------ |
| **Bootstrap**  | Randomly resample from actual historical returns                         |
| **Parametric** | Multivariate normal draws from the estimated mean and covariance         |
| **Copula**     | Student-t copula sampling that preserves tail dependence between assets  |

### Configuration

| Parameter             | Description                                    |
| --------------------- | ----------------------------------------------- |
| Initial amount        | Starting portfolio value                        |
| Simulation period     | Number of years to project (e.g. 30 years)      |
| Number of simulations | Up to 10,000 trials                             |
| Annual withdrawal     | Fixed annual withdrawal amount (optional)       |
| Distribution fitting  | Normal, Student-t, or Skew-Normal, with best-fit selection |

### Output

- **Fan chart** — Confidence bands (5th–95th percentile) showing the range of outcomes over time
- **Percentile outcomes** — Portfolio value at key percentiles
- **Success rate** — With a withdrawal amount set, the share of simulations where the portfolio survives the full period

> **Note:** Only a **fixed annual withdrawal amount** is supported — percentage-based, life-expectancy, guardrail, and custom-sequence withdrawal models are not available, and multi-stage goals planning is not modelled.

---

## Portfolio Optimisation

Find the optimal portfolio weights that maximise return for a given risk level, or minimise risk for a target return.

### Optimisation Strategies

| Family                         | Strategy / objective                                                             |
| ------------------------------ | --------------------------------------------------------------------------------- |
| **Mean-Variance (Markowitz)**  | **Max Sharpe** — best risk-adjusted return on the efficient frontier              |
| **Mean-Variance (Markowitz)**  | **Min Risk** — minimise portfolio volatility regardless of return                 |
| **Mean-Variance (Markowitz)**  | **Max Return** — maximise expected return subject to constraints                  |
| **Hierarchical Risk Parity**   | Cluster-based allocation (HRP) with dendrogram                                    |
| **Risk Parity**                | Equalise the risk contribution of each asset (inverse volatility / risk budgeting) |

You can run **multiple strategies at once**, start from a real portfolio **or a model**, and **save each result as a new model**.

### Constraints

| Constraint               | Description                      |
| ------------------------ | -------------------------------- |
| Min/max weight per asset | e.g. no single holding above 20% |
| Long-only                | No short selling                 |

### Output

- Optimised asset weights
- Expected return and risk at the optimal point
- Current vs recommended comparison chart
- Rebalancing trades needed to reach the optimal allocation

---

## Efficient Frontier

Visualise the set of all optimal portfolios — those offering the highest return for each level of risk.

### How It Works

1. Select the source — a real portfolio or a model
2. InvestaLens calculates a 50-point efficient frontier from historical returns
3. Hover any frontier point to see its allocation weights

### Chart Elements

| Element                    | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| Efficient frontier curve   | Set of optimal portfolios (risk vs return)                 |
| Minimum variance portfolio | Leftmost point on the frontier (lowest risk)               |
| Maximum Sharpe portfolio   | Tangent portfolio (best risk/return trade-off)             |
| Individual assets          | Each asset plotted by its own risk/return                  |
| Model overlays             | Selected models plotted as labelled points vs the frontier |

### Applications

- Identify whether your portfolio is inefficient (below the frontier)
- Find the optimal blend of your existing holdings
- Quantify the return you're sacrificing for lower risk (or vice versa)
- Test how adding a new asset shifts the frontier

---

## Black-Litterman Model

Combine market equilibrium returns with your own views to produce optimal portfolio weights that are more stable and intuitive than pure mean-variance optimisation.

### How It Works

1. **Start with equilibrium** — Derive implied expected returns from the market-cap-weighted benchmark portfolio
2. **Express views** — Specify your beliefs about absolute or relative asset returns (with confidence levels)
3. **Blend** — The model combines market equilibrium with your views, weighted by confidence
4. **Optimise** — Run mean-variance optimisation on the blended expected returns

### View Types

| View Type    | Example                                                          |
| ------------ | ---------------------------------------------------------------- |
| **Absolute** | "I expect Australian equities to return 8% per year"             |
| **Relative** | "I expect US tech to outperform emerging markets by 3% per year" |

Each view has a **confidence level** (0–100%) that determines how much weight it receives relative to market equilibrium.

### Why Use Black-Litterman?

Standard optimisation often produces extreme, concentrated portfolios because small differences in expected return estimates lead to large weight swings. Black-Litterman addresses this by:

- Starting from a diversified market equilibrium (sensible baseline)
- Only tilting away from equilibrium where you have a specific view
- Producing more stable, intuitive allocations that change gradually as views change

### Output

- Prior vs posterior expected returns comparison table
- Optimal weights under the blended (posterior) estimates
- The equilibrium **prior** can be seeded from a model portfolio's target weights (Prior: Market | Model)

> **Note:** Views are limited to **absolute** and **relative** return views with a per-view confidence slider — distributional (entropy-pooling), multi-expert opinion-pooling, and factor-level view frameworks are not supported.

---

## Estimation Methods

The quality of optimisation depends heavily on the accuracy of input estimates. InvestaLens provides multiple estimators for expected returns, covariance, and distributional assumptions.

### Expected Returns Estimators

| Estimator                   | Description                                                              | Best For                       |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| **Empirical (sample mean)** | Historical average returns                                               | Baseline, long histories       |
| **Shrunk (James-Stein)**    | Shrink sample means toward a common value to reduce estimation error     | Reducing extreme estimates     |
| **Exponentially Weighted**  | Recent returns weighted more heavily (decay parameter α)                 | Regime-sensitive analysis      |
| **Equilibrium (CAPM)**      | Derive expected returns from market weights via reverse optimisation     | Black-Litterman starting point |

### Covariance Estimators

Five estimators are available:

| Estimator                                       | Description                                                           | Best For                    |
| ----------------------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| **Empirical (sample)**                          | Standard sample covariance matrix                                      | Baseline                    |
| **Ledoit-Wolf Shrinkage**                       | Shrink toward a structured target                                      | Reducing estimation noise   |
| **Oracle Approximating Shrinkage (OAS)**        | Data-driven optimal shrinkage intensity                                | Automatic shrinkage tuning  |
| **Exponentially Weighted**                      | Recent observations weighted more heavily                              | Changing market regimes     |
| **Graphical Lasso (Sparse Inverse Covariance)** | Estimate sparse precision matrix via L1 penalty                        | High-dimensional portfolios |

### Distribution Modelling

For simulation, three univariate distributions can be fitted (with automatic best-fit selection):

| Distribution          | Properties                                              |
| --------------------- | -------------------------------------------------------- |
| **Gaussian (Normal)** | Symmetric, thin tails — simple baseline                  |
| **Student's t**       | Symmetric, heavy tails — captures extreme events         |
| **Skew-Normal**       | Captures asymmetry in the return distribution            |

Dependence between assets in Monte Carlo copula mode is modelled with a single **Student's t copula** (symmetric tail dependence — joint crash modelling). Other copula families (Clayton, Gumbel, vine copulas, etc.) are not supported.

---

## Model Validation & Selection

Evaluate allocation strategies out-of-sample before relying on them (Analytics → Model Selection).

### Methods

| Method                  | Description                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Walk Forward**        | Train on a rolling window, test on the next period (respects time ordering)         |
| **Strategy Comparison** | The `/cross-validate` evaluation runs a **fixed set of four strategies** and ranks them by out-of-sample Sharpe ratio |

### Evaluation Metrics

| Metric                         | Description                          |
| ------------------------------ | ------------------------------------- |
| **Out-of-sample Sharpe Ratio** | Risk-adjusted return on unseen data   |
| **Maximum Drawdown**           | Worst drawdown on test data           |

> **Note:** Combinatorial purged CV, K-fold variants, and hyperparameter grid/random search are not available — validation is walk-forward plus the fixed strategy comparison.

---

## Factor Analysis

Decompose portfolio returns into systematic risk factor exposures to understand what's truly driving performance.

### Supported Analyses

| Analysis                 | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------- |
| **PCA**                  | Principal Component Analysis with explained variance and per-asset loadings     |
| **Fama-French 3-Factor** | Regression on Market, Size (SMB), and Value (HML) factors                       |

### Regression Output

| Metric                  | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| Alpha                   | Return not explained by factor exposures (manager skill or luck) |
| Factor loadings (betas) | Exposure to each factor                                          |
| R²                      | How much of the return variance the model explains               |

### Use Cases

- **Performance attribution** — Is your return from skill (alpha) or factor exposure (beta)?
- **Risk budgeting** — How much risk comes from market, size, and value exposures?

> **Note:** Carhart 4-factor, Fama-French 5-factor, q-factor, and custom factor models are not available — factor analysis is PCA plus the Fama-French 3-factor regression.

---

## Tactical Asset Allocation

Compute signal-based dynamic weights for your holdings (Analytics → Tactical Allocation).

### Supported Strategies

| Strategy                     | Signal              | Description                                                       |
| ---------------------------- | ------------------- | ----------------------------------------------------------------- |
| **Momentum**                 | Lookback return     | Weight assets by recent return strength                           |
| **Mean Reversion**           | Lookback return     | Weight toward recent underperformers expecting reversion          |
| **Risk-Adjusted Momentum**   | Return ÷ volatility | Momentum scaled by realised volatility                            |
| **Volatility Targeting**     | Realised vol        | Scale exposure to maintain a target portfolio volatility          |
| **MA Crossover**             | Fast MA vs Slow MA  | Favour assets whose short-term MA is above the long-term MA       |
| **Dual Momentum**            | Absolute + Relative | Combine absolute and relative momentum signals                    |

### Output

Each strategy produces **signal scores and recommended weights** per asset, with a comparison chart across strategies.

> **Note:** The tool outputs weights only — it does not run a trading backtest (no trade log, time-in-market, turnover, or whipsaw statistics), and out-of-market assets, stop losses, and leverage are not configurable.

---

## Asset Correlations

Analyse statistical relationships between assets to build diversified portfolios (Analytics → Correlation Analysis).

### Correlation Analysis

| Feature             | Description                                              |
| ------------------- | --------------------------------------------------------- |
| Correlation matrix  | Pairwise correlations, colour-coded from −1 (red) to +1 (blue) |
| Cluster analysis    | Hierarchical clustering dendrogram grouping similar assets |
| Period selector     | 1Y, 3Y, or 5Y correlation window                           |

The source can be a real portfolio or a model. _(Autocorrelation and cointegration testing are not available.)_

---

## Scenario & Stress Testing

Model how your portfolio would perform under specific market scenarios (Analytics → Stress Testing, at `/analytics/stress-test`). Three modes are available: **historical**, **custom**, and **factor**.

### Historical Stress Scenarios

Test portfolio performance during six actual past crises:

| Scenario                | Period              | Description                                       |
| ----------------------- | ------------------- | ------------------------------------------------- |
| Global Financial Crisis | Oct 2007 – Mar 2009 | Credit crisis, bank failures, 50%+ equity decline |
| COVID-19 Crash          | Feb – Mar 2020      | Pandemic-driven 34% decline in 23 trading days    |
| Dot-com Bust            | Mar 2000 – Oct 2002 | Technology bubble burst, 78% NASDAQ decline       |
| 2022 Rate Shock         | Jan – Oct 2022      | Rapid rate rises hitting both stocks and bonds    |
| 1987 Black Monday       | Oct 1987            | 22% single-day market decline                     |
| Asian Financial Crisis  | 1997–1998           | Currency crises across emerging Asia              |

### Custom Scenarios

Define per-asset shocks — enter the percentage move for each holding and see the combined portfolio impact.

### Factor Stress Testing

"If the market drops X%, what happens?" — the market shock is propagated to each asset through its beta, producing a per-asset decomposition of the portfolio impact.

### Output

- Portfolio return under each scenario
- Worst affected holdings
- Per-asset impact breakdown

A simpler **What-If calculator** (`/analytics/what-if`) estimates the effect of a single broad market move. _(Copula-based conditional stress testing is not available.)_

---

## Capital Market Expectations ⏳ Not yet implemented

> **⏳ To be Implemented.** A standalone Capital Market Expectations tool is planned — see [GAPS.md](GAPS.md). The description below covers the intended experience.

Define forward-looking assumptions for expected returns, volatility, and correlations used in optimisation and simulation tools.

### Built-in Estimates

InvestaLens provides default capital market expectations based on:

- Historical long-run averages (with adjustable lookback)
- Current market conditions (yield-based estimates for bonds, earnings-based for equities)
- Published research house estimates

### Custom Expectations

Override defaults with your own views:

| Parameter       | Description                                       |
| --------------- | ------------------------------------------------- |
| Expected return | Annualised expected return per asset class        |
| Volatility      | Expected annualised standard deviation            |
| Correlations    | Custom correlation matrix                         |
| Confidence      | Weight given to your estimates vs historical data |

### Where Expectations Are Used

- Efficient frontier and optimisation (forward-looking mode)
- Monte Carlo simulation (forecasted returns model)
- Black-Litterman model (as the equilibrium baseline)
- FIRE Calculator (return assumption sensitivity)

---

## Model Portfolios

**Model portfolios** are virtual, weight-based target portfolios that plug into the analytics
engine exactly like a real portfolio. Each model is _instantiated_ (notionally bought with
whole units over a configurable lookback) and exposes the same returns matrix shape as a real
portfolio, so the Python compute layer is unchanged.

### Capabilities

| Surface | What a model adds |
| --- | --- |
| **Source picker** | Optimise, Backtest, Correlations, Factor Analysis, Efficient Frontier and Stress Testing accept `Portfolio | Model` as the source (shared `/api/v1/analytics/matrix?source=model` route) |
| **Optimiser** | Start from a model and **save** optimal weights as new model(s) — one per selected strategy |
| **Backtest** | Compare a mix of real + model portfolios against a benchmark (`POST /api/analytics/backtest/portfolios`) |
| **Efficient frontier** | Each selected model is plotted as a labelled (risk, return) point vs the curve |
| **Black-Litterman** | Seed the equilibrium **prior** from a model's target weights instead of cap/equal weights |
| **Comparison dashboard** | `/models` overlays the consolidated portfolio against models, scaled to a common start |
| **ETF X-ray** | Weighted look-through of a model's ETF constituents |
| **Constituent details** | Click any instrument in the Instantiation table to view a full detailed profile (OHLC price chart, performance vs. benchmarks, and company fundamentals) |

### Instantiation & Constituent Detail

When a model is viewed, it is instantiated using target weights. In the **Instantiation table**, every constituent's ticker code is clickable, leading to a dedicated detailed view showing:
- A timescale-synchronized **OHLC Price & Volume** chart with 20/50/200 moving averages.
- A **Performance** line chart plotting Total Return vs. Price Return (capital-only gain) compared to select benchmarks.
- A comprehensive **Company Profile** (fundamentals, analyst targets, news, and financials) retrieved from Yahoo Finance.

### Validity guard

A model is valid across its period only if every constituent has price history covering the
purchase date and is still actively priced (not delisted). System/default models are guarded
at seed time; user models surface a green/amber/red health badge. See
[the model portfolios overview](../plan/models-overview.md) for the full design.

---

## Integration with Portfolio Tracking

Advanced analytics tools integrate directly with your tracked portfolio:

| Integration                | Description                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Pre-filled allocations** | Your current portfolio weights are automatically loaded into backtest and optimisation tools |
| **Actual vs optimal**      | Compare your real portfolio to the efficient frontier                                        |
| **What-if analysis**       | Model the impact of a market move (`/analytics/what-if`) or load holdings from a model       |
| **Rebalance-to-model CGT** | The Unrealised CGT page estimates the tax cost of moving to a model's weights                |

---

## Related Documentation

| Document                 | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| [TOOLS.md](TOOLS.md)     | Performance reports, risk analysis (X-ray), and FIRE calculator |
| [TAX.md](TAX.md)         | CGT implications of rebalancing and optimisation trades         |
| [ASSETS.md](ASSETS.md)   | Supported asset types and exchanges available for analysis      |
| [API.md](API.md)         | Programmatic access to analytics results                        |
| [ACCOUNT.md](ACCOUNT.md) | Portfolio settings and custom groups used in analytics          |
