# InvestaLens Implementation Plan

## Release Structure

| Release | Focus                                                                  | Constraint                                  |
| ------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| **R0**  | Setup — project scaffolding, dependencies, dev environment             | No execution (Windows)                      |
| **R1**  | MVP — Australian market, ASX, AU bonds, AU tax, AU brokers, Public API | Deployable free (Vercel)                    |
| **R2**  | Advanced — All analytics from ADVANCED.md                              | Deployable free (Vercel + Python functions) |
| **R3**  | Global — International markets, currencies, tax regimes                | May need Pro tier                           |
| **R4**  | Wrap-up — Deferred features, polish, performance                       | Production-ready                            |

## Phase Structure (per Release)

Each release is split into two phases:

| Phase  | Description                                  | Environment                | Model          |
| ------ | -------------------------------------------- | -------------------------- | -------------- |
| **P1** | Coding — write all source code, no testing   | Windows (no npm/execution) | Large (Opus)   |
| **P2** | Validation — install, test, lint, build, fix | GitHub Codespaces (Ubuntu) | Small (Sonnet) |

P1 may be broken into subphases (P1a, P1b, ...) for manageability.

## File Index

### R0 — Setup

- [R0-P1.md](R0-P1.md) — Project scaffolding (coding)
- [R0-P2.md](R0-P2.md) — Environment validation

### R1 — MVP (Australian Market)

- [R1-overview.md](R1-overview.md) — Scope and feature list
- [R1-P1a.md](R1-P1a.md) — Foundation: schema, auth, CRUD, UI shell
- [R1-P1b.md](R1-P1b.md) — Import engine & market data
- [R1-P1c.md](R1-P1c.md) — Calculations, reports & tax
- [R1-P1d.md](R1-P1d.md) — Organisation, bonds, API & export
- [R1-P2.md](R1-P2.md) — MVP validation

### R2 — Advanced Analytics

- [R2-overview.md](R2-overview.md) — Scope and feature list
- [R2-P1a.md](R2-P1a.md) — Python infrastructure & backtesting
- [R2-P1b.md](R2-P1b.md) — Optimisation & efficient frontier
- [R2-P1c.md](R2-P1c.md) — Monte Carlo, estimation & distributions
- [R2-P1d.md](R2-P1d.md) — Factor analysis, tactical, stress testing
- [R2-P1e.md](R2-P1e.md) — AI Importer, FIRE, X-ray, research tools
- [R2-P2.md](R2-P2.md) — Advanced analytics validation

### R3 — Global Markets

- [R3-overview.md](R3-overview.md) — Scope and feature list
- [R3-P1a.md](R3-P1a.md) — Multi-market & currency infrastructure
- [R3-P1b.md](R3-P1b.md) — International brokers, tax & corporate actions
- [R3-P2.md](R3-P2.md) — Global validation

### R4 — Wrap-up

- [R4-overview.md](R4-overview.md) — Scope and feature list
- [R4-P1.md](R4-P1.md) — Remaining features & polish
- [R4-P2.md](R4-P2.md) — Final validation & production readiness

## Execution Notes

- **P1 agents** receive the plan file + relevant docs + existing source code as context
- **P2 agents** receive the plan file + the codebase created in P1 + error output
- Each P1 subphase builds on the previous — files created in P1a are available in P1b
- The agent should commit after each subphase for clean git history
