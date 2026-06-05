# R3 Overview: Multi-Market & International

## Objective

Expand InvestaLens from ASX-only to support 60+ global exchanges, multi-currency portfolios, international broker templates, FX conversions, and international tax considerations.

## Prerequisites

- R1 + R2 complete (MVP + analytics working for ASX)
- Reference: `docs/GETTING-STARTED.md`, `docs/DATA_IMPORT.md`, `docs/ASSETS.md`

---

## Scope

### In Scope (R3)
- Multi-market instrument support (60+ exchanges)
- FX rate fetching and storage (Open Exchange Rates API)
- Multi-currency portfolio valuation
- Currency gain/loss calculations (separate from capital gains)
- International broker CSV templates (Interactive Brokers, Schwab, Fidelity, Trading212, eToro, Degiro, Saxo)
- FX conversion at transaction date
- Reporting currency selection
- International ETF exposure mapping
- Withholding tax tracking (DTA rates)
- Global corporate action handling
- ASX-listed international ETFs (VGS, VGAD, IVV, etc.) with currency exposure

### Out of Scope (R4)
- Full international tax filing (only AU reporting perspective)
- Broker API connections
- Real-time streaming prices

---

## Subphase Breakdown

| Phase | Focus | Files |
|-------|-------|-------|
| R3-P1a | Multi-market infrastructure & FX | `plan/R3-P1a.md` |
| R3-P1b | International brokers, tax & corporate actions | `plan/R3-P1b.md` |
| R3-P2 | Validation in Codespaces | `plan/R3-P2.md` |

---

## Architecture Impact

- **Instrument model**: Already has `marketCode` field — populate with exchange MIC codes
- **Price table**: Add `currency` column if different from portfolio currency
- **ExchangeRate table**: Daily FX rates from Open Exchange Rates
- **Reports**: Add currency conversion layer — all values converted to portfolio's reporting currency
- **Performance calculation**: Separate local return vs currency return vs total return
- **Yahoo Finance**: International tickers use exchange suffixes (.L, .TO, .HK, .SI, etc.)
