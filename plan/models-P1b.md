# Model Portfolios — P1b: CRUD, Navigation & Pages

**Environment:** Windows (coding only — no execution).

## Objective

Make model portfolios manageable end-to-end: server actions (create/update/delete/
duplicate), a **Models** sidebar entry, and the list / detail / create / edit pages.
The comparison _dashboard_ on `/models` is built in P1c; this phase delivers the CRUD
shell and the per-model detail view.

## Recommended skills

- **vercel-composition-patterns** — composable constituent/weight editor.
- **shadcn** / **building-components** — forms, tables, dialogs consistent with existing UI.

## Prerequisites

- P1a complete (schema, validators, `model-portfolio.ts`, `model-analytics.ts`).
- Read `lib/actions/holding.ts` and `lib/actions/portfolio.ts` for the action conventions,
  and `components/layout/sidebar.tsx` for the nav array.

---

## Task 1: Server actions

**File: `lib/actions/model.ts`** (new) — follow the `auth → ownership → zod → prisma →
revalidatePath` convention.

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  createModelSchema,
  updateModelSchema,
  assertWeightsSumToOne,
} from "@/lib/validators/model";

/** Find-or-create an instrument by code+market (reuse holding.ts logic). */
async function resolveInstrument(code: string, marketCode: string, name?: string) {
  return db.instrument.upsert({
    where: { code_marketCode: { code, marketCode } },
    create: {
      code,
      marketCode,
      name: name ?? code,
      currency: marketCode === "ASX" ? "AUD" : "USD",
    },
    update: {},
  });
}

export async function createModel(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const data = createModelSchema.parse(input);
  assertWeightsSumToOne(data.constituents.map((c) => c.targetWeight));

  const constituents = await Promise.all(
    data.constituents.map(async (c) => {
      const instrument = await resolveInstrument(c.instrumentCode, c.marketCode, c.instrumentName);
      return { instrumentId: instrument.id, targetWeight: c.targetWeight };
    }),
  );

  const model = await db.modelPortfolio.create({
    data: {
      userId: session.user.id,
      name: data.name,
      description: data.description,
      category: data.category,
      provider: data.provider ?? "Custom",
      baseCurrency: data.baseCurrency,
      notionalCapital: data.notionalCapital,
      minCashWeight: data.minCashWeight,
      defaultLookbackYears: data.defaultLookbackYears,
      constituents: { create: constituents },
    },
  });

  revalidatePath("/models");
  return model;
}

export async function updateModel(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const data = updateModelSchema.parse(input);

  // Ownership: only the owner may edit; system models (userId null) are read-only.
  const existing = await db.modelPortfolio.findFirst({
    where: { id: data.id, userId: session.user.id },
  });
  if (!existing) throw new Error("Model not found or read-only");

  if (data.constituents) {
    assertWeightsSumToOne(data.constituents.map((c) => c.targetWeight));
  }

  // Replace constituents transactionally when supplied.
  await db.$transaction(async (tx) => {
    await tx.modelPortfolio.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        notionalCapital: data.notionalCapital,
        minCashWeight: data.minCashWeight,
        defaultLookbackYears: data.defaultLookbackYears,
      },
    });
    if (data.constituents) {
      await tx.modelConstituent.deleteMany({ where: { modelPortfolioId: data.id } });
      for (const c of data.constituents) {
        const instrument = await resolveInstrument(c.instrumentCode, c.marketCode, c.instrumentName);
        await tx.modelConstituent.create({
          data: { modelPortfolioId: data.id, instrumentId: instrument.id, targetWeight: c.targetWeight },
        });
      }
    }
    // Invalidate cached instantiations after an edit.
    await tx.modelInstantiation.deleteMany({ where: { modelPortfolioId: data.id } });
  });

  revalidatePath("/models");
  revalidatePath(`/models/${data.id}`);
}

export async function deleteModel(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const existing = await db.modelPortfolio.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) throw new Error("Model not found or read-only");
  await db.modelPortfolio.delete({ where: { id } });
  revalidatePath("/models");
}

/** Clone a model (incl. system defaults) into the user's own editable copy. */
export async function duplicateModel(id: string, name?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const src = await db.modelPortfolio.findFirst({
    where: { id, OR: [{ userId: session.user.id }, { userId: null }] },
    include: { constituents: true },
  });
  if (!src) throw new Error("Model not found");
  const copy = await db.modelPortfolio.create({
    data: {
      userId: session.user.id,
      name: name ?? `${src.name} (copy)`,
      description: src.description,
      category: src.category,
      provider: "Custom",
      baseCurrency: src.baseCurrency,
      notionalCapital: src.notionalCapital,
      minCashWeight: src.minCashWeight,
      defaultLookbackYears: src.defaultLookbackYears,
      constituents: {
        create: src.constituents.map((c) => ({ instrumentId: c.instrumentId, targetWeight: c.targetWeight })),
      },
    },
  });
  revalidatePath("/models");
  return copy;
}
```

**Listing helper** — `lib/services/model-list.ts` returns the current user's models **plus**
system models (`userId: null`), with summary stats (constituent count, top holdings).

```typescript
export async function getModelsForUser(userId: string) {
  return db.modelPortfolio.findMany({
    where: { archived: false, OR: [{ userId }, { userId: null }] },
    include: { constituents: { include: { instrument: true } } },
    orderBy: [{ isSystem: "desc" }, { category: "asc" }, { name: "asc" }],
  });
}
```

---

## Task 2: Sidebar navigation

**File: `components/layout/sidebar.tsx`** — add a **Models** item to `navItems` (place it
after Portfolio, before Accounts). Import an icon from `lucide-react` (e.g. `Target` or
`PieChart` — pick one not already used).

```typescript
import { LayoutDashboard, Briefcase, Target, Wallet, FileText, Calculator, Wrench, BarChart3, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/models", label: "Models", icon: Target },   // ← new
  { href: "/accounts", label: "Accounts", icon: Wallet },
  // ...unchanged...
];
```

---

## Task 3: Route group & pages

Create under `app/(dashboard)/models/`:

```
models/
├── page.tsx              # list + comparison dashboard (dashboard built in P1c)
├── models-client.tsx     # client wrapper for filters/range (P1c)
├── new/
│   └── page.tsx          # create form
├── [id]/
│   ├── page.tsx          # model detail (server component)
│   ├── model-detail-client.tsx
│   └── edit/
│       └── page.tsx      # edit form
└── _components/
    ├── model-form.tsx        # shared create/edit form (constituents + weights editor)
    ├── constituent-editor.tsx
    ├── model-card.tsx
    └── instantiation-table.tsx
```

### `app/(dashboard)/models/new/page.tsx` + `model-form.tsx`

The form captures: name, description, category (`MODEL_CATEGORIES`), provider, base
currency, notional capital, min cash weight, default lookback years, and a **constituent
editor** (add instrument by code/market via the existing instrument search, set weight per
row). Show a live **weights total** indicator that must equal 100% (uses
`assertWeightsSumToOne` client-side before submit). On submit call `createModel`.

> Reuse the instrument autocomplete/search component already used by the holding "add"
> flow (`components/forms/…`). Add a "Normalise weights" helper button that scales rows to
> sum to 1.

> **Time-period validity warning:** when a constituent is added, check its price coverage
> (call a lightweight server action wrapping `getModelCoverage`-style per-instrument min/max).
> If the instrument is **delisted/stale** or lacks history back to `today − defaultLookbackYears`,
> show an inline warning on that row ("No recent prices — may be delisted" / "History starts
> 2024-06, shorter than the 3-year lookback"). User models may still be saved with a warning;
> the detail/instantiation view repeats it.

### `app/(dashboard)/models/[id]/page.tsx` (detail)

Server component:

```tsx
import { instantiateModel } from "@/lib/services/model-portfolio";
import { getModelValueSeries } from "@/lib/services/model-analytics";
// auth + load model (owner or system), 404 via not-found.tsx if absent

export default async function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // load model, instantiation (default lookback), value series
  const { valueSeries, instantiation } = await getModelValueSeries(id);
  return (
    <ModelDetailClient
      /* model meta, target-weight pie, instantiation table, value-over-time chart */
    />
  );
}
```

The detail view shows:

- **Target allocation** (weights) — reuse a pie/bar chart (`components/charts/…`).
- **Instantiation table** — `instantiation-table.tsx`: code, name, target %, price@date,
  units (whole), cost, actual %, plus a **residual cash** row (highlight if any holding got
  0 units due to missing price).
- **Validity banner** — if `Instantiation.valid === false`, show a banner listing
  `invalidCodes` ("These constituents are delisted or lack prices for the selected period").
  Offer "Pick an earlier as-of date" or "Replace constituent". System models should never
  show this (seed guarantees validity).
- **Value over time** — `components/charts/portfolio-area-chart.tsx` fed by `valueSeries`.
- Controls: editable **as-of date** and **notional capital** (re-instantiate via a small
  server action / route that re-runs `instantiateModel`).
- Actions: Edit (owner only), Duplicate, Delete (owner only), "Optimise this model" → links
  to `/analytics/optimize?model=<id>` (P1d), "Backtest" → `/analytics/backtest?model=<id>`.

### `app/(dashboard)/models/[id]/edit/page.tsx`

Loads the model, pre-fills `model-form.tsx`, calls `updateModel`. System models (userId
null) are not editable — render a "Duplicate to edit" CTA instead.

---

## Task 4: Empty + error states

- `app/(dashboard)/models/loading.tsx`, `not-found.tsx`, `error.tsx` mirroring the existing
  `(dashboard)` segment files.
- Empty state on `/models` when the user has no custom models (system defaults still show).

---

## Deliverables (P1b)

- [ ] `lib/actions/model.ts` (create/update/delete/duplicate).
- [ ] `lib/services/model-list.ts`.
- [ ] Sidebar **Models** item.
- [ ] `models/new`, `models/[id]`, `models/[id]/edit` pages + `_components/*`.
- [ ] Detail view: target weights, instantiation table, value-over-time chart, controls.

## Commit

```
feat(models): model CRUD actions, sidebar nav, list/detail/create/edit pages
```
