# InvestaLens Advanced Analytics

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Corporate Actions](ACTIONS.md) | Next: [API Reference](API.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                                 | Status                    |
> | --------------------------------------- | ------------------------- |
> | Portfolio Backtesting                   | ⏳ To be Implemented (R2) |
> | Monte Carlo Simulation                  | ⏳ To be Implemented (R2) |
> | Portfolio Optimisation (20+ strategies) | ⏳ To be Implemented (R2) |
> | Efficient Frontier                      | ⏳ To be Implemented (R2) |
> | Black-Litterman Model                   | ⏳ To be Implemented (R2) |
> | Estimation Methods                      | ⏳ To be Implemented (R2) |
> | Model Validation & Selection            | ⏳ To be Implemented (R2) |
> | Factor Analysis                         | ⏳ To be Implemented (R2) |
> | Tactical Asset Allocation               | ⏳ To be Implemented (R2) |
> | Scenario & Stress Testing               | ⏳ To be Implemented (R2) |
> | Capital Market Expectations             | ⏳ To be Implemented (R2) |
>
> _All Advanced Analytics features are planned for Release 2 (R2). The Python analytics backend (`api/analytics/`) and placeholder page (`/analytics`) are scaffolded._

## Overview

InvestaLens includes a suite of advanced analytical tools for portfolio construction, backtesting, simulation, and factor analysis. These tools go beyond tracking and reporting — they help you make forward-looking investment decisions backed by quantitative analysis.

> **Note:** Advanced analytics tools use historical data and mathematical models. Past performance does not predict future results. These tools are for research and education purposes and do not constitute financial advice.

**Jump to:**

- [Portfolio Backtesting](#portfolio-backtesting)
- [Monte Carlo Simulation](#monte-carlo-simulation)
- [Portfolio Optimisation](#portfolio-optimisation)
- [Efficient Frontier](#efficient-frontier)
- [Black-Litterman Model](#black-litterman-model)
- [Estimation Methods](#estimation-methods)
- [Model Validation & Selection](#model-validation--selection)
- [Factor Analysis](#factor-analysis)
- [Tactical Asset Allocation](#tactical-asset-allocation)
- [Asset Correlations & Cointegration](#asset-correlations--cointegration)
- [Scenario & Stress Testing](#scenario--stress-testing)
- [Capital Market Expectations](#capital-market-expectations)

---

## Portfolio Backtesting

Test how a hypothetical portfolio allocation would have performed over a historical period. Compare up to three portfolios against a benchmark.

### Backtest Types

| Type                            | Description                                                       | Data Range                   |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| **Ticker-level backtest**       | Backtest specific ETFs, mutual funds, and stocks                  | From fund inception (varies) |
| **Asset class backtest**        | Backtest asset class allocations (e.g. "60% equities, 40% bonds") | From 1972                    |
| **Dynamic allocation backtest** | Backtest portfolios where assets or weights changed over time     | From fund inception          |

### Configuration

| Parameter            | Options                                                      |
| -------------------- | ------------------------------------------------------------ |
| Time period          | Custom start/end year, or full available history             |
| Initial investment   | Any dollar amount                                            |
| Periodic cashflows   | Contributions or withdrawals (monthly, quarterly, annually)  |
| Rebalancing          | None, monthly, quarterly, semi-annual, annual, or band-based |
| Benchmark            | Any index, ETF, or custom portfolio                          |
| Inflation adjustment | Nominal or real (CPI-adjusted) returns                       |

### Output Metrics

The backtest generates a comprehensive analysis:

**Performance summary:**

- Annualised return (CAGR), inflation-adjusted CAGR
- Best/worst year, positive months percentage
- Start and end balance

**Risk metrics:**

| Metric                    | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| Standard Deviation        | Annualised volatility                                                      |
| Maximum Drawdown          | Largest peak-to-trough decline                                             |
| Sharpe Ratio              | Risk-adjusted return (excess return / volatility)                          |
| Sortino Ratio             | Downside risk-adjusted return                                              |
| Calmar Ratio              | Return / maximum drawdown                                                  |
| Beta                      | Sensitivity to benchmark movements                                         |
| Alpha                     | Excess return after adjusting for benchmark exposure                       |
| R²                        | Percentage of variance explained by benchmark                              |
| Treynor Ratio             | Excess return per unit of systematic risk                                  |
| Value-at-Risk (VaR)       | Expected worst loss at 5% confidence (historical, analytical, conditional) |
| Upside/Downside Capture   | How much of the benchmark's up/down moves the portfolio captures           |
| Tracking Error            | Standard deviation of active returns vs benchmark                          |
| Information Ratio         | Active return / tracking error                                             |
| Safe Withdrawal Rate      | Maximum sustainable withdrawal rate over the period                        |
| Perpetual Withdrawal Rate | Withdrawal rate that preserves capital indefinitely                        |

**Visualisations:**

- Portfolio growth chart (vs benchmark)
- Annual returns bar chart (side-by-side)
- Drawdown chart with recovery periods
- Rolling returns (3-year, 5-year)
- Active return contribution by asset
- Up vs. down market scatter plot
- Risk decomposition pie chart

**Detailed tables:**

- Annual returns (with inflation, benchmark, and excess)
- Monthly returns
- Drawdown periods (start, trough, recovery time, depth)
- Historical stress period performance (GFC, COVID-19, etc.)
- Asset correlations matrix
- Return and risk decomposition by holding
- Holdings-based style analysis (asset allocation, sector, market cap, credit quality)

---

## Monte Carlo Simulation

Project the probability of different portfolio outcomes by running thousands of randomised return scenarios. Essential for retirement planning, withdrawal sustainability testing, and goal probability analysis.

### Simulation Models

| Model                     | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| **Historical returns**    | Randomly sample from actual historical year returns (bootstrap)          |
| **Forecasted returns**    | Use specified expected mean and standard deviation                       |
| **Statistical returns**   | Based on observed mean, volatility, and correlations of portfolio assets |
| **Parameterised returns** | User-specified statistical distribution (normal, log-normal, fat-tailed) |

### Configuration

| Parameter             | Description                                |
| --------------------- | ------------------------------------------ |
| Initial amount        | Starting portfolio value                   |
| Simulation period     | Number of years to project (e.g. 30 years) |
| Number of simulations | Typically 10,000 trials                    |
| Inflation model       | Historical, fixed rate, or bootstrapped    |
| Rebalancing           | Frequency during simulation                |
| Tax treatment         | Pre-tax or after-tax modelling             |

### Withdrawal Models

| Model                     | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| **Fixed amount**          | Constant annual withdrawal (inflation-adjusted)                                  |
| **Fixed percentage**      | Withdraw a % of current portfolio value each year                                |
| **Life expectancy (RMD)** | Variable percentage based on remaining life expectancy                           |
| **Custom sequence**       | Import a year-by-year cashflow schedule                                          |
| **Guardrails**            | Dynamic withdrawal with ceiling/floor adjustments based on portfolio performance |

### Output

- **Success rate** — Percentage of simulations where portfolio survives the full period
- **Percentile outcomes** — Portfolio value at 10th, 25th, 50th, 75th, 90th percentiles
- **Failure analysis** — When failures occur (year of depletion), average shortfall
- **Fan chart** — Confidence bands showing range of outcomes over time
- **Probability of reaching goals** — Can the portfolio meet specific future liabilities?
- **Sequence of returns risk** — Impact of early bad years vs late bad years

### Financial Goals Planning

Model multiple life stages with different cashflows:

1. **Accumulation phase** — Working years with regular contributions
2. **Transition** — Gap years, career breaks, or early retirement bridge
3. **Drawdown phase** — Retirement withdrawals
4. **Legacy** — Terminal portfolio value target for estate/bequest

Each stage can have different contribution/withdrawal amounts, asset allocations, and risk profiles.

---

## Portfolio Optimisation

Find the optimal portfolio weights that maximise return for a given risk level, or minimise risk for a target return.

### Optimisation Strategies

| Strategy                             | Objective                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| **Mean-Variance (Markowitz)**        | Maximise Sharpe Ratio — best risk-adjusted return on the efficient frontier     |
| **Minimum Variance**                 | Minimise portfolio volatility regardless of return                              |
| **Risk Parity**                      | Equalise the risk contribution of each asset (all assets contribute equal risk) |
| **Maximum Diversification**          | Maximise the diversification ratio                                              |
| **Conditional Value-at-Risk (CVaR)** | Minimise expected tail loss (worst-case scenarios)                              |
| **Maximum Drawdown**                 | Minimise the worst peak-to-trough decline                                       |
| **Kelly Criterion**                  | Maximise expected geometric growth rate (log-optimal portfolio)                 |
| **Sortino Ratio**                    | Maximise return per unit of downside risk                                       |
| **Omega Ratio**                      | Maximise the probability-weighted ratio of gains vs losses                      |
| **Tracking Error**                   | Minimise deviation from a target benchmark                                      |
| **Information Ratio**                | Maximise active return per unit of tracking error                               |

### Constraints

| Constraint               | Description                           |
| ------------------------ | ------------------------------------- |
| Min/max weight per asset | e.g. no single holding above 20%      |
| Group constraints        | e.g. total equities between 40–80%    |
| Long-only                | No short selling (default)            |
| Turnover limits          | Maximum rebalancing trade volume      |
| Sector/country limits    | Cap exposure to specific dimensions   |
| Cardinality              | Maximum number of assets in portfolio |

### Robust Optimisation

Standard mean-variance optimisation is sensitive to estimation errors in expected returns and covariances. Robust methods mitigate this:

- **Resampled efficient frontier** — Monte Carlo resampling of inputs to produce diversified portfolios
- **Shrinkage estimators** — Ledoit-Wolf covariance shrinkage toward structured targets
- **Bayesian methods** — Incorporate prior beliefs about return distributions

### Output

- Optimised asset weights
- Expected return and risk at the optimal point
- Comparison with current allocation and benchmark
- Marginal contribution to risk by each asset
- Rebalancing trades needed to reach optimal allocation

---

## Efficient Frontier

Visualise the set of all optimal portfolios — those offering the highest return for each level of risk.

### How It Works

1. Select the universe of assets (ETFs, funds, asset classes, or individual stocks)
2. Optionally specify allocation constraints (min/max weights)
3. Choose the risk measure for the frontier (variance, CVaR, CDaR, or any supported measure)
4. InvestaLens calculates the full efficient frontier using historical or forecasted returns
5. Your current portfolio is plotted on the chart showing how close it is to the frontier

### Chart Elements

| Element                    | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| Efficient frontier curve   | Set of optimal portfolios (risk vs return)                 |
| Current portfolio point    | Where your actual allocation sits relative to the frontier |
| Minimum variance portfolio | Leftmost point on the frontier (lowest risk)               |
| Maximum Sharpe portfolio   | Tangent portfolio (best risk/return trade-off)             |
| Individual assets          | Each asset plotted by its own risk/return                  |
| Capital Market Line        | Line from risk-free rate through tangent portfolio         |
| Naive portfolios           | 1/N and inverse-vol plotted for comparison                 |

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

### Advanced View Models

Beyond classic Black-Litterman, InvestaLens supports more expressive view frameworks:

| Model                  | Description                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Entropy Pooling**    | Express views on any distributional property (mean, CVaR, variance) — not just expected returns. Views are imposed by minimally distorting the prior distribution (maximum entropy principle) |
| **Opinion Pooling**    | Combine multiple expert opinions (each with their own views and confidence) into a single blended distribution with configurable expert weights                                               |
| **Factor-Level Views** | Express views on risk factors rather than individual assets — e.g. "quality factor will outperform value by 3%" — then propagate to asset-level through the factor model                      |

---

## Estimation Methods

The quality of optimisation depends heavily on the accuracy of input estimates. InvestaLens provides multiple estimators for expected returns, covariance, and distributional assumptions.

### Expected Returns Estimators

| Estimator                   | Description                                                              | Best For                       |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| **Empirical (sample mean)** | Historical average returns                                               | Baseline, long histories       |
| **Exponentially Weighted**  | Recent returns weighted more heavily (decay parameter α)                 | Regime-sensitive analysis      |
| **Shrinkage (James-Stein)** | Shrink sample means toward a common value to reduce estimation error     | Reducing extreme estimates     |
| **Equilibrium (implied)**   | Derive expected returns from market-cap weights via reverse optimisation | Black-Litterman starting point |
| **Factor Model**            | Estimate returns from factor exposures × factor premiums                 | Fundamental-based views        |

### Covariance Estimators

| Estimator                                       | Description                                                                   | Best For                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| **Empirical (sample)**                          | Standard sample covariance matrix                                             | Baseline                        |
| **Ledoit-Wolf Shrinkage**                       | Shrink toward structured target (identity, constant correlation)              | Reducing estimation noise       |
| **Oracle Approximating Shrinkage (OAS)**        | Data-driven optimal shrinkage intensity                                       | Automatic shrinkage tuning      |
| **Denoising (Random Matrix Theory)**            | Remove noise from eigenvalues below the Marchenko-Pastur threshold            | Large asset universes           |
| **Detoning**                                    | Remove the market mode (largest eigenvalue) to isolate relative relationships | Correlation-based clustering    |
| **Gerber Covariance**                           | Statistic based on co-movements exceeding a threshold — robust to outliers    | Fat-tailed return distributions |
| **Exponentially Weighted**                      | Recent observations weighted more heavily                                     | Changing market regimes         |
| **Regime-Adjusted Exponentially Weighted**      | Adjust decay based on detected market regimes                                 | Structural break awareness      |
| **Graphical Lasso (Sparse Inverse Covariance)** | Estimate sparse precision matrix via L1 penalty with cross-validation         | High-dimensional portfolios     |
| **Implied Covariance**                          | Derive from option prices or market-implied correlations                      | Forward-looking risk            |

### Distribution Modelling

For simulation and stress testing, model the full joint distribution of asset returns (not just mean and covariance):

#### Univariate Distributions

| Distribution                | Properties                                                |
| --------------------------- | --------------------------------------------------------- |
| **Gaussian (Normal)**       | Symmetric, thin tails — simple baseline                   |
| **Student's t**             | Symmetric, heavy tails — captures extreme events          |
| **Johnson Su**              | Flexible skew and kurtosis — fits empirical return shapes |
| **Normal Inverse Gaussian** | Semi-heavy tails with skew — common in finance            |

#### Dependence Modelling (Copulas)

Copulas separate marginal distributions from dependence structure, capturing non-linear relationships and tail dependence:

| Copula          | Tail Dependence                   | Use Case                          |
| --------------- | --------------------------------- | --------------------------------- |
| **Gaussian**    | None (asymptotically independent) | General-purpose baseline          |
| **Student's t** | Symmetric tail dependence         | Joint crash modelling             |
| **Clayton**     | Lower tail dependence             | Assets that crash together        |
| **Gumbel**      | Upper tail dependence             | Assets that rally together        |
| **Joe**         | Upper tail dependence (stronger)  | Concentrated co-movements         |
| **Vine Copula** | Flexible multi-asset structure    | Full portfolio joint distribution |

**Vine Copulas** decompose a high-dimensional joint distribution into a cascade of bivariate copulas, allowing different dependence structures between each pair of assets. Variants include Regular Vine, Centered Vine, and Clustered Vine.

### Prior Models

Prior models define the baseline assumptions fed into optimisation. They can be combined with views to produce posterior estimates:

| Prior               | Description                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Empirical**       | Use historical sample statistics directly                                                                     |
| **Black-Litterman** | Market equilibrium + investor views                                                                           |
| **Factor Model**    | Estimate asset returns from factor exposures                                                                  |
| **Synthetic Data**  | Generate synthetic return samples via copula models (Vine Copula) — useful for stress testing and sparse data |
| **Entropy Pooling** | Impose distributional views (on mean, CVaR, etc.) with minimal distortion                                     |
| **Opinion Pooling** | Blend multiple expert view sets with assigned probabilities                                                   |

---

## Model Validation & Selection

Prevent overfitting and data leakage when selecting optimisation models and parameters.

### Cross-Validation Methods

| Method                      | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| **Walk Forward**            | Train on expanding or rolling window, test on next period (respects time ordering)         |
| **Combinatorial Purged CV** | Generate all combinations of train/test folds with purging gaps to prevent look-ahead bias |
| **K-Fold (non-shuffled)**   | Standard K-fold without shuffling — preserves temporal blocks                              |
| **Multiple Randomised CV**  | Repeated random splits for robustness assessment                                           |

### Hyperparameter Tuning

Systematically search for optimal model parameters:

| Method                | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| **Grid Search**       | Exhaustive search over a specified parameter grid                 |
| **Randomised Search** | Sample parameters from distributions — efficient for large spaces |
| **Online Search**     | Incrementally update optimal parameters as new data arrives       |

**Example tuneable parameters:**

- Risk measure (Variance vs CVaR vs CDaR)
- Covariance estimator and its parameters (e.g. shrinkage intensity, decay factor)
- L2 regularisation coefficient
- Pre-selection K value
- Lookback window length

### Evaluation Metrics

| Metric                          | Description                                   |
| ------------------------------- | --------------------------------------------- |
| **Out-of-sample Sharpe Ratio**  | Risk-adjusted return on unseen data           |
| **Out-of-sample Sortino Ratio** | Downside-risk-adjusted return on unseen data  |
| **Turnover**                    | Average portfolio change per rebalance period |
| **Maximum Drawdown**            | Worst drawdown on test data                   |
| **Stability**                   | Consistency of results across CV folds        |

---

## Factor Analysis

Decompose portfolio returns into systematic risk factor exposures to understand what's truly driving performance.

### Supported Factor Models

| Model                    | Factors                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| **CAPM**                 | Market (MKT)                                                      |
| **Fama-French 3-Factor** | Market, Size (SMB), Value (HML)                                   |
| **Carhart 4-Factor**     | Market, Size, Value, Momentum (MOM)                               |
| **Fama-French 5-Factor** | Market, Size, Value, Profitability (RMW), Investment (CMA)        |
| **q-Factor**             | Market, Size (ME), Investment (I/A), ROE, Expected Growth (EG)    |
| **Custom**               | Any combination of available factors or user-uploaded time series |

### Additional Factors

| Factor                      | Description                                       |
| --------------------------- | ------------------------------------------------- |
| Short-term Reversal (STREV) | Recent losers outperform recent winners           |
| Long-term Reversal (LTREV)  | Long-run mean reversion                           |
| Quality (QMJ)               | Profitable, growing, safe firms outperform        |
| Bet Against Beta (BAB)      | Low-beta assets outperform on risk-adjusted basis |
| Term Risk                   | Interest rate sensitivity (for bonds)             |
| Credit Risk                 | Credit spread sensitivity (for bonds)             |

### Regression Output

| Metric                   | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| Alpha                    | Return not explained by factor exposures (manager skill or luck) |
| Factor loadings (betas)  | Exposure to each factor                                          |
| R²                       | How much of the return variance the model explains               |
| t-statistics             | Statistical significance of each factor loading                  |
| Residual volatility      | Unexplained (idiosyncratic) risk                                 |
| Rolling factor exposures | How factor loadings change over time                             |

### Use Cases

- **Performance attribution** — Is your fund's return from skill (alpha) or factor exposure (beta)?
- **Style analysis** — Is this "growth" fund actually a closet value fund?
- **Risk budgeting** — How much risk comes from market, size, value, momentum?
- **Fund comparison** — Compare factor exposures across similar funds
- **Factor timing** — Analyse whether a manager rotates factor exposures

---

## Tactical Asset Allocation

Test rules-based timing strategies that dynamically shift between assets or to cash based on market signals.

### Supported Models

| Model                            | Signal              | Description                                                       |
| -------------------------------- | ------------------- | ----------------------------------------------------------------- |
| **Moving Averages (Single)**     | Price vs MA         | Invest when price > moving average, go to cash when below         |
| **Moving Averages (Portfolio)**  | Per-asset MA        | Apply moving average rule to each asset independently             |
| **Moving Average Cross-over**    | Fast MA vs Slow MA  | Buy when short-term MA crosses above long-term MA                 |
| **Momentum (Relative Strength)** | Lookback return     | Rank assets by recent return, hold the top N                      |
| **Dual Momentum**                | Absolute + Relative | Hold top asset only if it also beats cash (combines both signals) |
| **Adaptive Allocation**          | Multi-signal        | Combine momentum, volatility, and correlation for dynamic weights |
| **Target Volatility**            | Realised vol        | Scale exposure to maintain a target portfolio volatility          |
| **Market Valuation**             | CAPE / Shiller PE   | Adjust equity allocation based on valuation metrics               |
| **Seasonal**                     | Calendar            | Adjust allocation based on historical seasonal patterns           |

### Configuration

| Parameter           | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| Lookback period     | Window for calculating signals (e.g. 200-day MA, 12-month momentum) |
| Out-of-market asset | Where to park capital when signal says "sell" (cash, bonds, gold)   |
| Trading frequency   | Daily, weekly, monthly, quarterly                                   |
| Stop loss           | Maximum drawdown before forced exit                                 |
| Assets to hold      | How many top-ranked assets to hold (for momentum strategies)        |
| Leverage            | Optional leverage multiplier                                        |
| Trade execution     | Same day close, next day open                                       |

### Backtest Output

All tactical models produce the same backtest output as standard portfolio backtests (see above), plus:

- **Signal chart** — Visualise when the model is invested vs in cash
- **Trade log** — Every entry and exit with dates and prices
- **Time in market** — Percentage of time invested vs out
- **Turnover** — Number of trades and portfolio turnover rate
- **Tax impact** — Estimated short-term vs long-term gains from frequent trading
- **Whipsaw analysis** — False signals that triggered unnecessary trades

---

## Asset Correlations & Cointegration

Analyse statistical relationships between assets to build diversified portfolios and identify pairs for relative value strategies.

### Correlation Analysis

| Feature              | Description                                            |
| -------------------- | ------------------------------------------------------ |
| Correlation matrix   | Pairwise correlations between all selected assets      |
| Rolling correlations | How correlations change over time (regime-dependent)   |
| Correlation heatmap  | Visual matrix with colour coding                       |
| Cluster analysis     | Group assets by similarity of return patterns          |
| Crisis correlations  | Correlations specifically during market stress periods |

### Autocorrelation

Analyse whether an asset's returns are serially correlated (today's return predicts tomorrow's). Important for:

- Detecting momentum or mean-reversion tendencies
- Identifying illiquidity premiums
- Validating random walk assumptions

### Cointegration

Test whether two assets share a long-run equilibrium relationship (even if individually non-stationary). Used for:

- Pairs trading strategy validation
- Portfolio construction with mean-reverting spreads
- Identifying economic relationships between assets

---

## Scenario & Stress Testing

Model how your portfolio would perform under specific market scenarios — both historical and hypothetical.

### Historical Stress Scenarios

Test portfolio performance during actual past crises:

| Scenario                | Period              | Description                                       |
| ----------------------- | ------------------- | ------------------------------------------------- |
| Global Financial Crisis | Oct 2007 – Mar 2009 | Credit crisis, bank failures, 50%+ equity decline |
| COVID-19 Crash          | Feb – Mar 2020      | Pandemic-driven 34% decline in 23 trading days    |
| Dot-com Bust            | Mar 2000 – Oct 2002 | Technology bubble burst, 78% NASDAQ decline       |
| 2022 Rate Shock         | Jan – Oct 2022      | Rapid rate rises hitting both stocks and bonds    |
| 1987 Black Monday       | Oct 1987            | 22% single-day market decline                     |
| European Debt Crisis    | 2010–2012           | Sovereign debt fears across eurozone              |
| Asian Financial Crisis  | 1997–1998           | Currency crises across emerging Asia              |

### Hypothetical Scenarios

Define custom \"what if\" scenarios:

- **Interest rate shock** — What if rates rise 200bps in 6 months?
- **Equity crash** — What if equities fall 30% over 3 months?
- **Stagflation** — What if inflation rises to 8% while growth stalls?
- **Currency crisis** — What if AUD depreciates 20% against USD?
- **Sector collapse** — What if a specific sector (e.g. property, tech) declines 50%?

### Conditional Stress Testing (Copula-Based)

The most sophisticated stress testing approach uses the fitted joint distribution (Vine Copula) to generate realistic correlated scenarios conditioned on a specific event:

**How it works:**

1. Fit a copula model to the historical joint return distribution of all portfolio assets
2. Condition on a specific event (e.g. \"Bank of America drops 20%\")
3. Sample thousands of scenarios from the conditional distribution
4. Evaluate portfolio performance across all conditioned samples

**Example:** \"What would happen to my portfolio if my largest holding dropped 20%?\"

- The copula generates correlated movements in all other assets consistent with that shock
- Output shows the distribution of portfolio outcomes, not just a single point estimate
- Captures realistic tail dependencies (assets that crash together in crises)

### Factor Stress Testing

Apply stress to risk factors rather than individual assets:

1. Fit a factor model to your portfolio (e.g. market, quality, momentum factors)
2. Stress a specific factor (e.g. \"quality factor CVaR = 10%\")
3. Propagate the factor stress to all assets through their factor loadings
4. Evaluate portfolio impact

**Advantages over asset-level stress testing:**

- More parsimonious — stress a small number of factors instead of dozens of assets
- More realistic — factor stresses propagate consistently across all exposures
- Better for scenario design — easier to articulate economic narratives in factor terms

### Output

- Portfolio return under each scenario
- Comparison with benchmark
- Distribution of outcomes (percentile fan) for conditional stress tests
- Worst affected holdings
- Which assets provide protection (hedging effectiveness)
- Recovery timeline based on historical precedent
- Probability of exceeding a loss threshold

---

## Capital Market Expectations

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

## Integration with Portfolio Tracking

Advanced analytics tools integrate directly with your tracked portfolio:

| Integration                    | Description                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| **Pre-filled allocations**     | Your current portfolio weights are automatically loaded into backtest and optimisation tools |
| **Actual vs optimal**          | Compare your real portfolio to the efficient frontier                                        |
| **What-if rebalancing**        | Model the impact of proposed trades before executing                                         |
| **Factor exposure monitoring** | Ongoing factor regression as your portfolio changes                                          |
| **Tax-aware optimisation**     | Optimisation respects unrealised gains when suggesting rebalancing trades                    |
| **Backtest validation**        | Compare your actual tracked return against the theoretical backtest                          |

---

## Related Documentation

| Document                 | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| [TOOLS.md](TOOLS.md)     | Performance reports, risk analysis (X-ray), and FIRE calculator |
| [TAX.md](TAX.md)         | CGT implications of rebalancing and optimisation trades         |
| [ASSETS.md](ASSETS.md)   | Supported asset types and exchanges available for analysis      |
| [API.md](API.md)         | Programmatic access to analytics results                        |
| [ACCOUNT.md](ACCOUNT.md) | Portfolio settings and custom groups used in analytics          |
