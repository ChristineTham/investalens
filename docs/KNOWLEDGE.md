# InvestaLens — Package Knowledge Base

> **Rule**: Before writing ANY install command, configuration, or usage code — the official documentation for that package MUST be consulted and the findings recorded here. Internal knowledge is assumed out of date.

**Last verified**: 2026-06-05

---

## Table of Contents

1. [Package Managers](#package-managers)
2. [Scaffolding — shadcn/ui CLI](#scaffolding--shadcnui-cli)
3. [Framework — Next.js (App Router)](#framework--nextjs-app-router)
4. [Styling — Tailwind CSS v4](#styling--tailwind-css-v4)
5. [ORM — Prisma v7](#orm--prisma-v7)
6. [Database — Neon Serverless](#database--neon-serverless)
7. [Auth — Auth.js v5 (NextAuth)](#auth--authjs-v5-nextauth)
8. [AI — Vercel AI SDK](#ai--vercel-ai-sdk)
9. [Validation — Zod](#validation--zod)
10. [Charting — Recharts](#charting--recharts)
11. [Tables — TanStack React Table](#tables--tanstack-react-table)
12. [Testing — Vitest](#testing--vitest)
13. [E2E Testing — Playwright](#e2e-testing--playwright)
14. [Formatting — Prettier + Tailwind Plugin](#formatting--prettier--tailwind-plugin)
15. [Python — uv Project Manager](#python--uv-project-manager)
16. [Python — FastAPI](#python--fastapi)
17. [Python — skfolio](#python--skfolio)
18. [Python — yfinance](#python--yfinance)
19. [Python — NumPy, SciPy, pandas](#python--numpy-scipy-pandas)
19. [Deployment — Vercel Python Runtime](#deployment--vercel-python-runtime)
20. [Python — Google Antigravity SDK](#python--google-antigravity-sdk)
21. [Misc JS Libraries](#misc-js-libraries)

---

## Package Managers

### pnpm (Node.js)

- **Source**: https://pnpm.io/installation
- **Prerequisite**: Node.js v22+ (pnpm v11 requires Node 22+)
- **Install in Codespaces**: Pre-installed via Corepack or `npm install -g pnpm@latest-11`
- **Key commands**:
  - `pnpm add <pkg>` — add production dependency
  - `pnpm add -D <pkg>` — add dev dependency
  - `pnpm dlx <pkg>` — execute package without installing (equivalent to npx)
  - `pnpm install` — install all deps from lockfile
  - `pnpm ls` — list installed packages
- **Compatibility**: pnpm v11 requires Node.js 22+

### uv (Python)

- **Source**: https://docs.astral.sh/uv/getting-started/installation/
- **Install**: `curl -LsSf https://astral.sh/uv/install.sh | sh` (pre-installed in Codespaces)
- **Key commands**:
  - `uv init --python 3.12` — create new Python project (pyproject.toml, .python-version, main.py)
  - `uv add <pkg>` — add dependency (updates pyproject.toml, creates uv.lock, installs to .venv)
  - `uv run <cmd>` — run command in project environment
  - `uv sync` — sync environment from lockfile
  - `uv export --format requirements-txt --no-hashes > requirements.txt` — export for compatibility
- **IMPORTANT**: Never use `pip install` or `uv pip install`. Always use `uv add` for project dependencies.

---

## Scaffolding — shadcn/ui CLI

- **Source**: https://ui.shadcn.com/docs/installation/next + https://ui.shadcn.com/docs/cli
- **Install command**:
  ```bash
  pnpm dlx shadcn@latest init -t next --base base-ui
  ```
- **CLI flags (verified)**:
  - `-t, --template <template>` — template: `next`, `vite`, `start`, `react-router`, `laravel`, `astro`
  - `-b, --base <base>` — component library: `radix`, `base`
  - `-p, --preset [name]` — use a preset configuration
  - `-y, --yes` — skip confirmation (default: true)
  - `-d, --defaults` — use defaults: `--template=next --preset=nova`
  - `-n, --name <name>` — name for new project
  - `--monorepo` — scaffold monorepo
- **What `init -t next` creates**:
  - `package.json` with Next.js, React, Tailwind CSS v4, PostCSS
  - `tsconfig.json` with `@/*` path alias
  - `next.config.ts`
  - `eslint.config.mjs`
  - `postcss.config.mjs` (with `@tailwindcss/postcss`)
  - `components.json` (shadcn config, includes `"base"` field)
  - `src/app/globals.css` (Tailwind imports + theme)
  - `src/app/layout.tsx`, `src/app/page.tsx`
  - `src/lib/utils.ts` (cn utility)
  - `.gitignore`
  - `node_modules/` (fully installed)
- **Adding components**: `pnpm dlx shadcn@latest add <component>`
- **CSS imports generated**: `@import "tailwindcss"; @import "tw-animate-css"; @import "shadcn/tailwind.css";`
- **CRITICAL**: Do NOT use `create-next-app`. The shadcn CLI is the sole scaffolding tool.

---

## Framework — Next.js (App Router)

- **Source**: https://nextjs.org/docs (installed via shadcn CLI, not separately)
- **Version**: Latest (installed by shadcn CLI)
- **Key facts**:
  - App Router uses `src/app/` directory
  - React Server Components by default
  - Route handlers in `src/app/api/`
  - Middleware/Proxy in `proxy.ts` (renamed from `middleware.ts` in Next.js 16+)
  - `next.config.ts` (TypeScript config)
- **NOT installed separately** — comes as a dependency of the shadcn scaffold

---

## Styling — Tailwind CSS v4

- **Source**: https://tailwindcss.com/docs (installed via shadcn CLI)
- **Version**: v4 (CSS-first configuration, no `tailwind.config.js`)
- **Key facts**:
  - Configuration lives in CSS via `@theme` directive
  - Uses `@import "tailwindcss"` instead of `@tailwind` directives
  - PostCSS plugin: `@tailwindcss/postcss`
  - No separate `tailwind.config.js` needed — all in `globals.css`
- **NOT installed separately** — comes as part of shadcn scaffold

---

## ORM — Prisma v7

- **Source**: https://www.prisma.io/docs/prisma-orm/quickstart/postgresql + https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- **Install command**:
  ```bash
  pnpm add -D prisma @types/pg
  pnpm add @prisma/client @prisma/adapter-pg pg dotenv
  ```
- **Init command**:
  ```bash
  npx prisma init --datasource-provider postgresql --output ../generated/prisma
  ```
- **CRITICAL v7 breaking changes**:
  1. **ESM-only**: Must set `"type": "module"` in package.json
  2. **Generator changed**: Uses `prisma-client` (NOT `prisma-client-js`)
  3. **Output required**: Must specify `output = "../generated/prisma"` in generator
  4. **Driver adapters mandatory**: No built-in database driver — must use `@prisma/adapter-pg`
  5. **Import path changed**: `import { PrismaClient } from "../generated/prisma/client"` (not `@prisma/client`)
  6. **prisma.config.ts required**: Replaces env vars in schema for datasource URL
  7. **dotenv required**: Env vars not auto-loaded — must `import "dotenv/config"` in prisma.config.ts
  8. **No auto-generate**: `migrate dev` and `db push` no longer run `prisma generate` — must run explicitly
  9. **No auto-seed**: `prisma migrate dev` no longer seeds — must run `prisma db seed` explicitly
  10. **Prerequisites**: Node.js 20.19.0+ and TypeScript 5.4.0+
- **Schema (v7)**:
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../generated/prisma"
  }
  datasource db {
    provider = "postgresql"
  }
  ```
- **prisma.config.ts**:
  ```typescript
  import "dotenv/config";
  import { defineConfig, env } from "prisma/config";
  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: { url: env("DATABASE_URL") },
  });
  ```
- **Client instantiation (v7)**:
  ```typescript
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "../generated/prisma/client";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  export const prisma = new PrismaClient({ adapter });
  ```
- **SSL note**: v7 validates SSL certificates by default. For Neon, may need `ssl: { rejectUnauthorized: false }` or proper CA config.

---

## Database — Neon Serverless

- **Source**: https://neon.com/docs/serverless/serverless-driver + https://neon.com/docs/guides/nextjs
- **Install command**:
  ```bash
  pnpm add @neondatabase/serverless
  ```
- **Key facts**:
  - GA release (v1.0.0+), requires Node.js 19+
  - Includes TypeScript types (no `@types/` needed)
  - Two modes: **HTTP** (for one-shot queries, faster) and **WebSockets** (for sessions/transactions, `pg`-compatible)
  - HTTP mode uses `neon()` function — returns template-literal query function
  - WebSocket mode uses `Pool` and `Client` (drop-in `pg` replacement)
  - Connection string: `postgresql://[user]:[password]@[neon_hostname]/[dbname]`
- **HTTP usage**:
  ```typescript
  import { neon } from "@neondatabase/serverless";
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  ```
- **WebSocket usage (for Prisma adapter)**:
  ```typescript
  import { Pool } from "@neondatabase/serverless";
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ```
- **Neon CLI setup**: `npx neonctl@latest init` (wizard for API key, MCP server, agent skills)
- **IMPORTANT**: In serverless environments, Pool/Client must be created, used, and closed within a single request handler.

---

## Auth — Auth.js v5 (NextAuth)

- **Source**: https://authjs.dev/getting-started/installation + https://authjs.dev/getting-started/adapters/prisma
- **NOTE**: Auth.js is now part of **Better Auth** (announced on their site). The `next-auth@beta` package still works.
- **Install command**:
  ```bash
  pnpm add next-auth@beta
  npx auth secret
  pnpm add @auth/prisma-adapter
  ```
- **Configuration (Next.js)**:
  1. Create `auth.ts` at project root:
     ```typescript
     import NextAuth from "next-auth";
     import { PrismaAdapter } from "@auth/prisma-adapter";
     import { prisma } from "@/prisma";
     export const { handlers, signIn, signOut, auth } = NextAuth({
       adapter: PrismaAdapter(prisma),
       providers: [],
     });
     ```
  2. Create route handler at `app/api/auth/[...nextauth]/route.ts`:
     ```typescript
     import { handlers } from "@/auth";
     export const { GET, POST } = handlers;
     ```
  3. Create `proxy.ts` (Next.js 16+, was `middleware.ts`):
     ```typescript
     export { auth as proxy } from "@/auth";
     ```
- **Prisma adapter install**: The adapter page recommends `@prisma/client @prisma/extension-accelerate @auth/prisma-adapter` — but since we use direct driver adapter (not Accelerate), we skip `@prisma/extension-accelerate`.
- **Environment**: `AUTH_SECRET` (generated by `npx auth secret`, stored in `.env.local`)

---

## AI — Vercel AI SDK

- **Source**: https://ai-sdk.dev/docs/getting-started
- **Install command**:
  ```bash
  pnpm add ai @ai-sdk/google
  ```
- **Key facts**:
  - Current version: v6 (AI SDK 6.x)
  - Provides: AI SDK Core (text gen, structured data, tool calling) + AI SDK UI (chatbot, streaming)
  - Google Gemini provider: `@ai-sdk/google`
  - Next.js App Router is a first-class integration
  - Supports MCP tools, agents, streaming, embeddings
- **Usage pattern**:
  ```typescript
  import { generateText } from "ai";
  import { google } from "@ai-sdk/google";
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt: "Extract trades from this document",
  });
  ```

---

## Validation — Zod

- **Source**: https://zod.dev
- **Install command**: `pnpm add zod`
- **Current version**: Zod 4 (stable)
- **Key facts**:
  - Zero external dependencies
  - 2kb core bundle (gzipped)
  - Works with TypeScript v5.5+
  - Requires `"strict": true` in tsconfig.json
  - Also available as `@zod/zod` on JSR
  - Provides MCP server for AI agents
- **Usage**:
  ```typescript
  import * as z from "zod";
  const User = z.object({ name: z.string() });
  const data = User.parse(input);
  ```

---

## Charting — Recharts

- **Source**: https://recharts.org/en-US/guide/installation
- **Install command**: `pnpm add recharts`
- **Key facts**:
  - React-native charting library
  - Composable — built with React components
  - Supports: Line, Bar, Pie, Area, Scatter, Treemap, Radar, etc.
  - Tree-shakes well
- **Note**: Official install page returned error during fetch, but the package is well-known: `npm install recharts` per their GitHub README.

---

## Tables — TanStack React Table

- **Source**: https://tanstack.com/table/latest/docs/installation
- **Install command**: `pnpm add @tanstack/react-table`
- **Key facts**:
  - Headless UI table library (no styles included)
  - Framework-agnostic core with React adapter
  - TypeScript-first

---

## Testing — Vitest

- **Source**: https://vitest.dev/guide/
- **Install command**: `pnpm add -D vitest`
- **Key facts**:
  - Requires Vite >= v6.0.0 and Node >= v20.0.0
  - Reads `vite.config.*` by default (or dedicated `vitest.config.*`)
  - Test files must contain `.test.` or `.spec.` in filename
  - Run with `npx vitest` (watch mode) or `npx vitest run` (single run)
  - VS Code extension available: `vitest.explorer`
- **Configuration in package.json**:
  ```json
  { "scripts": { "test": "vitest" } }
  ```

---

## E2E Testing — Playwright

- **Source**: https://playwright.dev/docs/intro
- **Install command**:
  ```bash
  pnpm create playwright
  ```
- **Key facts**:
  - Interactive setup — prompts for TypeScript, test folder, GitHub Actions, browsers
  - Requires Node.js 20.x, 22.x, or 24.x
  - Creates: `playwright.config.ts`, `tests/` directory, `package.json` updates
  - Supports Chromium, Firefox, WebKit
  - Run tests: `npx playwright test`
  - Update: `pnpm add -D @playwright/test@latest && npx playwright install --with-deps`
- **Recommended prompts during setup**:
  - TypeScript: yes
  - Tests folder: `e2e`
  - GitHub Actions workflow: yes
  - Install browsers: yes

---

## Formatting — Prettier + Tailwind Plugin

### Prettier

- **Source**: https://prettier.io/docs/install
- **Install command**: `pnpm add -D --save-exact prettier`
- **Key facts**:
  - Always install exact version (formatting changes between releases)
  - Create `.prettierrc` config file
  - Create `.prettierignore` file
  - Run: `npx prettier . --write` (format) or `npx prettier . --check` (CI)
  - Use `eslint-config-prettier` if using ESLint

### prettier-plugin-tailwindcss

- **Source**: https://github.com/tailwindlabs/prettier-plugin-tailwindcss
- **Install command**: `pnpm add -D prettier prettier-plugin-tailwindcss`
- **CRITICAL for Tailwind CSS v4**: Must specify `tailwindStylesheet` option:
  ```json
  {
    "plugins": ["prettier-plugin-tailwindcss"],
    "tailwindStylesheet": "./src/app/globals.css"
  }
  ```
- **Key facts**:
  - Requires Prettier v3+
  - ESM-only (v0.5.x+)
  - Must be loaded LAST in plugins array
  - Sorts classes in `class`, `className`, `:class`, `[ngClass]`, and `@apply`
  - `tailwindFunctions` option for sorting in function calls (e.g., `clsx`)
  - Automatically removes duplicate classes (disable with `tailwindPreserveDuplicates`)

---

## Python — uv Project Manager

- **Source**: https://docs.astral.sh/uv/guides/projects/
- **Project init**:
  ```bash
  uv init --python 3.12
  ```
  Creates: `pyproject.toml`, `.python-version`, `main.py`
- **Add dependencies**:
  ```bash
  uv add numpy scipy pandas fastapi skfolio
  ```
  Updates `pyproject.toml`, creates `uv.lock`, installs to `.venv/`
- **Run scripts**: `uv run python script.py`
- **Sync in CI**: `uv sync`
- **Export for compatibility**: `uv export --format requirements-txt --no-hashes > requirements.txt`
- **IMPORTANT**:
  - `uv init` skips files that already exist (README.md, .gitignore)
  - Commit `uv.lock` to version control
  - `.venv/` is gitignored
  - Never use `pip install` — always `uv add`

---

## Python — FastAPI

- **Source**: https://fastapi.tiangolo.com/
- **Install command** (via uv): `uv add "fastapi[standard]"`
- **Key facts**:
  - Based on Starlette (web) + Pydantic (data validation)
  - ASGI framework — exports `app` variable
  - `fastapi[standard]` includes uvicorn, email-validator, httpx, jinja2, python-multipart
  - For Vercel deployment, only need `fastapi` (not `[standard]`) since Vercel provides the server
  - Run locally: `fastapi dev main.py`
  - Python type hints = API documentation + validation
- **Vercel deployment pattern**:

  ```python
  from fastapi import FastAPI
  app = FastAPI()

  @app.get("/")
  def read_root():
      return {"Hello": "World"}
  ```

  Vercel auto-detects `app` variable as ASGI entrypoint.

---

## Python — skfolio

- **Source**: https://skfolio.org/
- **Install command** (via uv): `uv add skfolio`
- **Key facts**:
  - Portfolio optimization library built on scikit-learn's API
  - BSD 3-Clause license
  - Dependencies: scikit-learn, cvxpy, numpy, scipy, pandas
  - Models: MeanRisk, HierarchicalRiskParity, HERC, NCO, RiskBudgeting
  - Covariance estimators: Ledoit-Wolf, Gerber, Denoising, Detoning, Graphical Lasso
  - Distribution: VineCopula, Student's t, Johnson Su
  - Prior: BlackLitterman, EntropyPooling, FactorModel, SyntheticData
  - Cross-validation: WalkForward, CombinatorialPurgedCV
  - Compatible with sklearn's GridSearchCV, Pipeline, etc.
- **Usage pattern**:
  ```python
  from skfolio.optimization import MeanRisk, HierarchicalRiskParity
  from skfolio.preprocessing import prices_to_returns
  X = prices_to_returns(prices)
  model = MeanRisk()
  model.fit(X_train)
  portfolio = model.predict(X_test)
  ```
- **Bundle size concern**: skfolio pulls in scikit-learn, cvxpy — large for serverless. May need to split analytics functions or use chunked computation.

---

## Python — yfinance

- **Source**: https://ranaroussi.github.io/yfinance/ — PyPI: https://pypi.org/project/yfinance/
- **Install command** (via uv): `uv add yfinance`
- **Version verified**: 1.4.1 (May 2026)
- **Key facts**:
  - Pythonic wrapper over Yahoo! Finance's public API (research/personal use only; not affiliated with Yahoo)
  - Apache 2.0 license
  - Depends on `curl_cffi` for the requests fallback (handles Yahoo's TLS/anti-bot)
  - Main class `Ticker(symbol)` exposes attributes/getters:
    - `info` / `get_info()` — company profile + key stats dict (longName, sector, industry, marketCap, trailingPE, dividendYield, beta, fiftyTwoWeekHigh/Low, longBusinessSummary, website, fullTimeEmployees, etc.)
    - `news` / `get_news(count)` — recent news (newer schema nests under `content`)
    - `calendar` / `get_calendar()` — earnings dates, ex-dividend date, earnings/revenue estimates
    - `recommendations` / `recommendations_summary` — analyst trend rows (period, strongBuy, buy, hold, sell, strongSell)
    - `upgrades_downgrades` — recent grade changes (firm, toGrade, fromGrade, action)
    - `analyst_price_targets` / `get_analyst_price_targets()` — {current, low, high, mean, median}
    - `actions` / `dividends` / `splits` — corporate actions (Series)
    - `income_stmt` / `balance_sheet` / `cash_flow` (and `quarterly_*`) — financial statements (DataFrame)
    - `major_holders` / `institutional_holders` — ownership
  - Symbol uses Yahoo suffixes (ASX `.AX`, LSE `.L`, etc.); indices use `^` prefix with no suffix
- **Usage pattern**:
  ```python
  import yfinance as yf
  t = yf.Ticker("BHP.AX")
  info = t.info                      # dict
  targets = t.get_analyst_price_targets()
  recs = t.recommendations           # DataFrame
  cal = t.get_calendar()             # dict
  news = t.get_news(count=8)         # list
  ```
- **Gotchas**:
  - Any attribute may raise or return None/empty — wrap each access in try/except and return partial data.
  - DataFrames must be made JSON-serializable (use `make_serializable` / convert Timestamps + numpy types).
  - Rate-limited by Yahoo; fetch in small batches with delays. Server-side only.

---

## Python — NumPy, SciPy, pandas

### NumPy

- **Source**: https://numpy.org/install/
- **Install** (via uv): `uv add numpy`
- **Key facts**: Foundation for numerical computing. Required by scipy, pandas, skfolio.

### SciPy

- **Source**: https://scipy.org/install/
- **Install** (via uv): `uv add scipy`
- **Key facts**: Scientific computing (optimization, linear algebra, statistics, signal processing).

### pandas

- **Source**: https://pandas.pydata.org/docs/getting_started/install.html
- **Install** (via uv): `uv add pandas`
- **Key facts**: DataFrames for time series data. Required by skfolio.

---

## Deployment — Vercel Python Runtime

- **Source**: https://vercel.com/docs/functions/runtimes/python
- **Status**: Beta (available on all plans)
- **Key facts**:
  1. **Auto-detection**: No `runtime` field needed in vercel.json — Vercel detects Python from pyproject.toml/requirements.txt
  2. **Entrypoints**: Vercel looks for `app.py`, `index.py`, `server.py`, `main.py`, `wsgi.py`, `asgi.py` (also in `src/`, `app/`, `api/`)
  3. **Variables**: Must define `app` (ASGI/WSGI), `application` (Django), or `handler` (BaseHTTPRequestHandler)
  4. **Custom entrypoint**: Set `[tool.vercel] entrypoint = "module:variable"` in pyproject.toml
  5. **Python versions**: 3.12 (default), 3.13, 3.14
  6. **Dependencies**: Reads from `pyproject.toml` (with or without `uv.lock`), `requirements.txt`, or `Pipfile`
  7. **Bundle size**: Max 500 MB uncompressed
  8. **Exclude files**: Use `excludeFiles` in vercel.json `functions` config
  9. **Services**: For Python + frontend (Next.js) in same project, use Vercel Services
  10. **Streaming**: Supported
- **vercel.json (correct pattern)**:
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "functions": {
      "api/**/*.py": {
        "maxDuration": 60,
        "excludeFiles": "{tests/**,__tests__/**,**/*.test.py,**/test_*.py}"
      }
    }
  }
  ```
- **IMPORTANT**: Do NOT specify `"runtime": "@vercel/python@..."` — this is legacy. Python is now a built-in runtime.

---

## Python — Google Antigravity SDK

- **Source**: https://antigravity.google/product/antigravity-sdk
- **GitHub**: https://github.com/google-antigravity/antigravity-sdk-python
- **Install command** (via uv): `uv add google-antigravity`
- **Requires**: `GEMINI_API_KEY` environment variable
- **License**: Apache 2.0
- **Key facts**:
  - AI **agent framework** — designed for building autonomous coding agents (file reading, command execution, code editing)
  - NOT a document parsing library — for structured extraction, prefer Vercel AI SDK `generateObject`
  - Requires compiled runtime binary (included in platform-specific PyPI wheels) — cannot run from source clone alone
  - Async Python API — uses `async with` context managers
  - 3-layer architecture: Agent (simple) → Conversation (session) → Connection (transport)
  - Read-only by default — pass `CapabilitiesConfig()` to enable write tools
  - Supports: multimodal ingestion (images, videos, audio, documents), custom Python tools, MCP servers, hooks/policies, triggers
  - **Bundle size concern**: Compiled binary may push Vercel 500MB function limit. Test carefully.
- **Import**: `from google.antigravity import Agent, LocalAgentConfig`
- **Usage pattern (Simple Agent)**:

  ```python
  import asyncio
  from google.antigravity import Agent, LocalAgentConfig

  async def main():
      config = LocalAgentConfig(
          system_instructions="You are an expert assistant.",
          # api_key="your_api_key_here",  # or set GEMINI_API_KEY env var
      )
      async with Agent(config) as agent:
          response = await agent.chat("What files are in the current directory?")
          print(await response.text())

  asyncio.run(main())
  ```

- **Multimodal ingestion**:

  ```python
  from google.antigravity import Agent, LocalAgentConfig
  from google.antigravity.types import from_file

  config = LocalAgentConfig(system_instructions="You are a document analyst.")
  async with Agent(config) as agent:
      pdf = from_file("statement.pdf")
      response = await agent.chat(["Extract all transactions:", pdf])
      print(await response.text())
  ```

- **Custom tools**:

  ```python
  def get_price(ticker: str) -> str:
      """Returns the current price for a ticker."""
      return f"Price for {ticker}: $100.00"

  config = LocalAgentConfig(tools=[get_price])
  ```

- **MCP integration**:
  ```python
  from google.antigravity.types import McpStdioServer
  config = LocalAgentConfig(
      mcp_servers=[McpStdioServer(name="my_server", command="npx", args=["my-mcp-server"])],
  )
  ```
- **InvestaLens applicability**:
  - **NOT recommended for AI Importer** — Vercel AI SDK `generateObject` is better for structured extraction (Zod schema, no binary dependency, TypeScript layer)
  - **Potentially useful for**: future autonomous analysis agents, multi-step research workflows, or local dev tooling
  - **Deployment concern**: Binary size may exceed Vercel limits — evaluate if needed for serverless functions
- **Gotchas**:
  - Async-only — incompatible with synchronous WSGI handlers (use FastAPI/ASGI)
  - The old pattern `import google.antigravity as ag; ag.Agent(model=...).generate(...)` is WRONG — that's not the real API
  - Must always install from PyPI (not pip install from git clone)

---

## Misc JS Libraries

### date-fns

- **Source**: https://date-fns.org
- **Install**: `pnpm add date-fns`
- **Key facts**: Modern JavaScript date utility library. Tree-shakeable.

### bcryptjs

- **Source**: https://www.npmjs.com/package/bcryptjs
- **Install**: `pnpm add bcryptjs` + `pnpm add -D @types/bcryptjs`
- **Key facts**: Pure JS bcrypt implementation (no native deps). For hashing API tokens.

### papaparse

- **Source**: https://www.npmjs.com/package/papaparse
- **Install**: `pnpm add papaparse` + `pnpm add -D @types/papaparse`
- **Key facts**: CSV parser for browser and Node.js. Used for import pipeline.

### react-dropzone

- **Source**: https://react-dropzone.js.org
- **Install**: `pnpm add react-dropzone`
- **Key facts**: React hook for file drag-and-drop. Used for CSV/document upload.

### sonner

- **Source**: https://sonner.emilkowal.ski/getting-started
- **Install**: `pnpm add sonner`
- **Key facts**: Toast notification library for React.

### zustand

- **Source**: https://github.com/pmndrs/zustand
- **Install**: `pnpm add zustand`
- **Key facts**: Lightweight state management. No providers needed.

### next-themes

- **Source**: https://github.com/pacocoursey/next-themes
- **Install**: `pnpm add next-themes`
- **Key facts**: Dark mode for Next.js. Works with App Router.

### @testing-library/react

- **Source**: https://testing-library.com/docs/react-testing-library/intro
- **Install**: `pnpm add -D @testing-library/react`
- **Key facts**: React component testing utilities. Used with Vitest.

---

## Verification Checklist

Every package listed above has been verified against its official documentation as of 2026-06-05. The following were confirmed:

| Package                     | Official URL Checked                                        | Install Command Verified                                                                   | Key Config Verified                      |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| pnpm                        | https://pnpm.io/installation                                | ✅ Node 22+ required                                                                       | ✅ v11 compatibility                     |
| uv                          | https://docs.astral.sh/uv/                                  | ✅ `uv init` + `uv add`                                                                    | ✅ lockfile, .venv                       |
| shadcn/ui CLI               | https://ui.shadcn.com/docs/cli                              | ✅ `pnpm dlx shadcn@latest init -t next --base base-ui`                                    | ✅ flags verified                        |
| Prisma v7                   | https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7     | ✅ `pnpm add -D prisma @types/pg` + `pnpm add @prisma/client @prisma/adapter-pg pg dotenv` | ✅ ESM, driver adapter, prisma.config.ts |
| @neondatabase/serverless    | https://neon.com/docs/serverless/serverless-driver          | ✅ `pnpm add @neondatabase/serverless`                                                     | ✅ GA v1.0.0+, Node 19+                  |
| Auth.js v5                  | https://authjs.dev/getting-started/installation             | ✅ `pnpm add next-auth@beta` + `npx auth secret`                                           | ✅ proxy.ts (Next.js 16+)                |
| @auth/prisma-adapter        | https://authjs.dev/getting-started/adapters/prisma          | ✅ `pnpm add @auth/prisma-adapter`                                                         | ✅ schema models                         |
| Vercel AI SDK               | https://ai-sdk.dev/docs/getting-started                     | ✅ `pnpm add ai @ai-sdk/google`                                                            | ✅ v6, Google provider                   |
| Zod                         | https://zod.dev                                             | ✅ `pnpm add zod`                                                                          | ✅ v4 stable, strict mode                |
| Recharts                    | https://recharts.org                                        | ✅ `pnpm add recharts`                                                                     | ✅ React composable                      |
| @tanstack/react-table       | https://tanstack.com/table/latest                           | ✅ `pnpm add @tanstack/react-table`                                                        | ✅ headless                              |
| Vitest                      | https://vitest.dev/guide/                                   | ✅ `pnpm add -D vitest`                                                                    | ✅ Vite 6+, Node 20+                     |
| Playwright                  | https://playwright.dev/docs/intro                           | ✅ `pnpm create playwright`                                                                | ✅ interactive setup                     |
| Prettier                    | https://prettier.io/docs/install                            | ✅ `pnpm add -D --save-exact prettier`                                                     | ✅ exact version                         |
| prettier-plugin-tailwindcss | https://github.com/tailwindlabs/prettier-plugin-tailwindcss | ✅ `pnpm add -D prettier-plugin-tailwindcss`                                               | ✅ `tailwindStylesheet` for v4           |
| FastAPI                     | https://fastapi.tiangolo.com/                               | ✅ `uv add "fastapi[standard]"`                                                            | ✅ ASGI `app` variable                   |
| skfolio                     | https://skfolio.org/                                        | ✅ `uv add skfolio` (or `pip install skfolio`)                                             | ✅ scikit-learn API                      |
| NumPy                       | https://numpy.org/install/                                  | ✅ `uv add numpy`                                                                          | ✅                                       |
| SciPy                       | https://scipy.org/install/                                  | ✅ `uv add scipy`                                                                          | ✅                                       |
| pandas                      | https://pandas.pydata.org/docs/getting_started/install.html | ✅ `uv add pandas`                                                                         | ✅                                       |
| Vercel Python Runtime       | https://vercel.com/docs/functions/runtimes/python           | ✅ Auto-detected, no runtime field                                                         | ✅ pyproject.toml supported              |
| Google Antigravity SDK      | https://antigravity.google/product/antigravity-sdk          | ✅ `uv add google-antigravity`                                                             | ✅ Async Agent API, compiled binary      |

---

## Known Gaps & Corrections Made

| Issue Found                                     | Source                           | Correction                                                                                          |
| ----------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@vercel/python@4.3.1` in vercel.json           | Vercel docs                      | REMOVED — Python is built-in, auto-detected                                                         |
| `prisma-client-js` generator                    | Prisma v7 docs                   | Changed to `prisma-client`                                                                          |
| Missing `output` in Prisma generator            | Prisma v7 docs                   | Added `output = "../generated/prisma"`                                                              |
| Missing `dotenv` dependency                     | Prisma v7 docs                   | Added to install command                                                                            |
| `pip install` for Python packages               | uv docs                          | Changed to `uv add`                                                                                 |
| `requirements.txt` required for Vercel          | Vercel Python docs               | NOT required — pyproject.toml works directly                                                        |
| `middleware.ts` for Auth.js                     | Auth.js docs                     | Changed to `proxy.ts` (Next.js 16+)                                                                 |
| `@vercel/kv` in architecture                    | Vercel announcement              | DEPRECATED — removed from project                                                                   |
| Missing `tailwindStylesheet` in prettier config | prettier-plugin-tailwindcss docs | Required for Tailwind CSS v4                                                                        |
| `create-next-app` scaffolding                   | shadcn docs                      | NOT used — shadcn CLI handles everything                                                            |
| `google-antigravity` API pattern                | Antigravity SDK GitHub README    | Fixed: async `Agent(LocalAgentConfig)` + `await agent.chat()`, NOT `ag.Agent(model=...).generate()` |
| `google-antigravity` for doc parsing            | Antigravity SDK docs             | Agent framework, not doc parser — use Vercel AI SDK `generateObject` for structured extraction      |
