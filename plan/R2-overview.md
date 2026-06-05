# R2 Overview: Advanced Analytics (Python Engine)

## Objective

Build the Python serverless analytics engine using skfolio, implementing portfolio optimisation, Monte Carlo simulation, factor analysis, advanced estimation methods, backtesting, stress testing, and AI-powered features.

## Prerequisites

- R1 complete (working MVP with holdings, prices, reports)
- Vercel Python runtime configured (from R0)
- Reference: `docs/ADVANCED.md`, `docs/ARCHITECTURE.md`

---

## Scope

### In Scope (R2)
- Python serverless function infrastructure (Vercel Python runtime)
- Portfolio backtesting engine
- Mean-Variance optimisation with constraints
- Efficient frontier calculation and visualisation
- Black-Litterman model
- Hierarchical Risk Parity (HRP)
- Monte Carlo simulation (bootstrap, parametric, copula)
- Covariance and return estimation methods (all from skfolio)
- Distribution fitting (univariate + copula)
- Factor models (Fama-French, custom factors)
- Tactical allocation (signal-based, momentum, mean-reversion)
- Stress testing (historical scenarios, custom, conditional)
- Cross-validation and model selection
- AI Importer (Gemini/Antigravity: parse unstructured statements)
- FIRE Calculator
- Portfolio X-ray (ETF look-through)
- Share Checker (duplicate detection)
- Market Sentiment dashboard

### Out of Scope (R3+)
- Multi-market support (still ASX only)
- International tax
- Additional broker integrations

---

## Subphase Breakdown

| Phase | Focus | Files |
|-------|-------|-------|
| R2-P1a | Python infrastructure + backtesting | `plan/R2-P1a.md` |
| R2-P1b | Optimisation + efficient frontier + BL | `plan/R2-P1b.md` |
| R2-P1c | Monte Carlo + estimation + distributions | `plan/R2-P1c.md` |
| R2-P1d | Factor analysis + tactical + stress testing | `plan/R2-P1d.md` |
| R2-P1e | AI features + FIRE + X-ray + tools | `plan/R2-P1e.md` |
| R2-P2 | Validation in Codespaces | `plan/R2-P2.md` |

---

## Architecture Notes

All Python functions are deployed as Vercel Serverless Functions under `/api/python/`:
- Max execution time: 60s (Vercel Pro) or 10s (free)
- Max memory: 1024 MB
- Each function is a standalone `.py` file with a handler
- Communication: TypeScript API routes call Python functions via internal HTTP
- Input: JSON body with portfolio data (holdings, returns, constraints)
- Output: JSON response with results

Python functions do NOT access the database directly. The TypeScript layer:
1. Fetches data from DB
2. Transforms to analytics input format
3. Calls Python function
4. Caches results (Vercel Runtime Cache API for expensive computations)
5. Returns to frontend
