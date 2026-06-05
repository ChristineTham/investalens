# R1-P1a: Foundation — Schema, Auth, CRUD, UI Shell

## Objective

Build the core database schema, authentication system, portfolio/holding/transaction CRUD operations, and the application UI shell (navigation, layouts, basic pages).

## Prerequisites

- R0-P1 completed (project scaffolding exists)
- Reference: `docs/ACCOUNT.md`, `docs/GETTING-STARTED.md`, `docs/DATA_IMPORT.md`

---

## Task 1: Complete Prisma Schema

**File: `prisma/schema.prisma`**

Replace the placeholder schema with the full data model:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts   Account[]
  sessions   Session[]
  portfolios Portfolio[]
  apiTokens  ApiToken[]
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

model ApiToken {
  id        String    @id @default(cuid())
  userId    String
  name      String
  tokenHash String    @unique
  scope     String    @default("read") // read, write, admin
  expiresAt DateTime?
  lastUsed  DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── PORTFOLIO ───────────────────────────────────────────────────────────────

model Portfolio {
  id                  String   @id @default(cuid())
  userId              String
  name                String
  taxResidency        String   @default("AU") // ISO country code
  baseCurrency        String   @default("AUD")
  financialYearEnd    Int      @default(6) // Month number (6 = June)
  performanceMethod   String   @default("compound") // simple | compound
  taxEntityType       String   @default("individual") // individual | smsf | company | trust
  saleAllocationMethod String  @default("fifo") // fifo | lifo | min_gain | max_gain | min_tax
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  holdings     Holding[]
  cashAccounts CashAccount[]
  shares       PortfolioShare[]
  importJobs   ImportJob[]

  @@index([userId])
}

model PortfolioShare {
  id          String   @id @default(cuid())
  portfolioId String
  email       String
  accessLevel String   @default("read") // read | write | admin
  createdAt   DateTime @default(now())

  portfolio Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)

  @@unique([portfolioId, email])
}

// ─── HOLDINGS & TRANSACTIONS ─────────────────────────────────────────────────

model Holding {
  id             String   @id @default(cuid())
  portfolioId    String
  instrumentId   String
  isCustom       Boolean  @default(false)
  drpEnabled     Boolean  @default(false)
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  portfolio    Portfolio     @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  instrument   Instrument   @relation(fields: [instrumentId], references: [id])
  transactions Transaction[]
  labels       HoldingLabel[]

  @@unique([portfolioId, instrumentId])
  @@index([portfolioId])
}

model Instrument {
  id               String   @id @default(cuid())
  code             String   // Ticker symbol
  marketCode       String   // Exchange code (ASX, NYSE, etc.)
  name             String
  instrumentType   String   @default("equity") // equity | etf | lic | managed_fund | bond | fixed_interest | crypto | fx | custom
  country          String?
  sector           String?
  industry         String?
  currency         String   @default("AUD")
  // Bond-specific fields
  faceValue        Decimal? @db.Decimal(18, 6)
  couponRate       Decimal? @db.Decimal(8, 4)
  paymentFrequency String?  // monthly | quarterly | semi_annual | annual
  maturityDate     DateTime?
  creditRating     String?
  // Custom investment fields
  isCustom         Boolean  @default(false)
  createdByUserId  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  holdings Holding[]
  prices   Price[]

  @@unique([code, marketCode])
  @@index([code])
}

model Transaction {
  id              String   @id @default(cuid())
  holdingId       String
  transactionType String   // BUY, SELL, DIVIDEND, INTEREST, COUPON, MATURITY, SPLIT, FEE, TRANSFER_IN, TRANSFER_OUT, RETURN_OF_CAPITAL, ADJUSTMENT, MERGER_IN, MERGER_OUT, RIGHTS_ISSUE, BONUS
  tradeDate       DateTime
  quantity        Decimal  @db.Decimal(18, 6)
  price           Decimal  @db.Decimal(18, 6)
  brokerage       Decimal  @default(0) @db.Decimal(18, 2)
  exchangeRate    Decimal  @default(1) @db.Decimal(18, 6)
  currency        String   @default("AUD")
  comments        String?
  // Tax fields
  frankedAmount   Decimal? @db.Decimal(18, 2)
  unfrankedAmount Decimal? @db.Decimal(18, 2)
  frankingCredits Decimal? @db.Decimal(18, 2)
  taxDeferred     Decimal? @db.Decimal(18, 2)
  foreignTax      Decimal? @db.Decimal(18, 2)
  // AMIT fields (JSON for flexibility)
  amitComponents  Json?
  // Import metadata
  importJobId     String?
  sourceId        String?  // External ID for deduplication
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  holding   Holding    @relation(fields: [holdingId], references: [id], onDelete: Cascade)
  importJob ImportJob? @relation(fields: [importJobId], references: [id])

  @@index([holdingId, tradeDate])
  @@index([holdingId, transactionType])
}

// ─── MARKET DATA ─────────────────────────────────────────────────────────────

model Price {
  id           String   @id @default(cuid())
  instrumentId String
  date         DateTime @db.Date
  open         Decimal? @db.Decimal(18, 6)
  high         Decimal? @db.Decimal(18, 6)
  low          Decimal? @db.Decimal(18, 6)
  close        Decimal  @db.Decimal(18, 6)
  volume       BigInt?
  adjustedClose Decimal? @db.Decimal(18, 6)

  instrument Instrument @relation(fields: [instrumentId], references: [id], onDelete: Cascade)

  @@unique([instrumentId, date])
  @@index([instrumentId, date])
}

model ExchangeRate {
  id       String   @id @default(cuid())
  fromCurrency String
  toCurrency   String
  date     DateTime @db.Date
  rate     Decimal  @db.Decimal(18, 6)

  @@unique([fromCurrency, toCurrency, date])
  @@index([fromCurrency, toCurrency, date])
}

// ─── IMPORT ──────────────────────────────────────────────────────────────────

model ImportJob {
  id           String   @id @default(cuid())
  portfolioId  String
  source       String   // csv | sharesight | broker_api | manual
  status       String   @default("pending") // pending | processing | completed | failed
  fileName     String?
  mappingTemplate String? // JSON: column mapping config
  totalRows    Int      @default(0)
  importedRows Int      @default(0)
  rejectedRows Int      @default(0)
  errors       Json?    // Array of error objects
  createdAt    DateTime @default(now())
  completedAt  DateTime?

  portfolio    Portfolio     @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@index([portfolioId])
}

model MappingTemplate {
  id          String   @id @default(cuid())
  userId      String
  name        String   // e.g. "CommSec", "SelfWealth"
  broker      String?
  mapping     Json     // Column mapping configuration
  dateFormat  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}

// ─── ORGANISATION ────────────────────────────────────────────────────────────

model CustomGroup {
  id         String   @id @default(cuid())
  userId     String
  name       String
  createdAt  DateTime @default(now())

  categories CustomGroupCategory[]

  @@index([userId])
}

model CustomGroupCategory {
  id        String @id @default(cuid())
  groupId   String
  name      String
  holdings  CustomGroupAssignment[]

  group CustomGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
}

model CustomGroupAssignment {
  id           String @id @default(cuid())
  categoryId   String
  instrumentId String

  category CustomGroupCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, instrumentId])
}

model Label {
  id     String @id @default(cuid())
  userId String
  name   String

  holdings HoldingLabel[]

  @@unique([userId, name])
}

model HoldingLabel {
  holdingId String
  labelId   String

  holding Holding @relation(fields: [holdingId], references: [id], onDelete: Cascade)
  label   Label   @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([holdingId, labelId])
}

// ─── CASH ACCOUNTS ───────────────────────────────────────────────────────────

model CashAccount {
  id           String   @id @default(cuid())
  portfolioId  String
  name         String
  currency     String   @default("AUD")
  balance      Decimal  @default(0) @db.Decimal(18, 2)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  portfolio    Portfolio          @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  transactions CashTransaction[]

  @@index([portfolioId])
}

model CashTransaction {
  id            String   @id @default(cuid())
  cashAccountId String
  type          String   // deposit | withdrawal | interest | fee | dividend_received | trade_settlement
  amount        Decimal  @db.Decimal(18, 2)
  date          DateTime
  description   String?
  createdAt     DateTime @default(now())

  cashAccount CashAccount @relation(fields: [cashAccountId], references: [id], onDelete: Cascade)

  @@index([cashAccountId, date])
}

// ─── WATCHLIST ───────────────────────────────────────────────────────────────

model Watchlist {
  id     String @id @default(cuid())
  userId String
  name   String @default("Default")

  items WatchlistItem[]

  @@index([userId])
}

model WatchlistItem {
  id           String   @id @default(cuid())
  watchlistId  String
  instrumentId String
  notes        String?
  alertAbove   Decimal? @db.Decimal(18, 6)
  alertBelow   Decimal? @db.Decimal(18, 6)
  addedAt      DateTime @default(now())

  watchlist  Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)

  @@unique([watchlistId, instrumentId])
}
```

---

## Task 2: NextAuth Configuration

**File: `src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/portfolio",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
});
```

**File: `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

**File: `src/types/next-auth.d.ts`**

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

---

## Task 3: Zod Validators

**File: `src/lib/validators/portfolio.ts`**

```typescript
import { z } from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
  taxResidency: z.string().length(2).default("AU"),
  financialYearEnd: z.number().int().min(1).max(12).default(6),
  performanceMethod: z.enum(["simple", "compound"]).default("compound"),
  taxEntityType: z.enum(["individual", "smsf", "company", "trust"]).default("individual"),
});

export const updatePortfolioSchema = createPortfolioSchema.partial().extend({
  saleAllocationMethod: z.enum(["fifo", "lifo", "min_gain", "max_gain", "min_tax"]).optional(),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
```

**File: `src/lib/validators/transaction.ts`**

```typescript
import { z } from "zod";

export const transactionTypes = [
  "BUY", "SELL", "DIVIDEND", "INTEREST", "COUPON", "MATURITY",
  "SPLIT", "FEE", "TRANSFER_IN", "TRANSFER_OUT", "RETURN_OF_CAPITAL",
  "ADJUSTMENT", "MERGER_IN", "MERGER_OUT", "RIGHTS_ISSUE", "BONUS",
] as const;

export const createTransactionSchema = z.object({
  holdingId: z.string().cuid(),
  transactionType: z.enum(transactionTypes),
  tradeDate: z.coerce.date(),
  quantity: z.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  price: z.number().min(0),
  brokerage: z.number().min(0).default(0),
  exchangeRate: z.number().positive().default(1),
  currency: z.string().length(3).default("AUD"),
  comments: z.string().max(500).optional(),
  // Dividend-specific
  frankedAmount: z.number().optional(),
  unfrankedAmount: z.number().optional(),
  frankingCredits: z.number().optional(),
  taxDeferred: z.number().optional(),
  foreignTax: z.number().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
```

**File: `src/lib/validators/holding.ts`**

```typescript
import { z } from "zod";

export const createHoldingSchema = z.object({
  portfolioId: z.string().cuid(),
  instrumentCode: z.string().min(1).max(20),
  marketCode: z.string().min(1).max(10).default("ASX"),
  instrumentName: z.string().min(1).max(200).optional(),
  instrumentType: z.enum([
    "equity", "etf", "lic", "managed_fund", "bond",
    "fixed_interest", "crypto", "fx", "custom",
  ]).default("equity"),
  // Initial transaction (optional — can add later)
  initialTransaction: createTransactionSchema.omit({ holdingId: true }).optional(),
});

const createTransactionSchema_inner = z.object({
  transactionType: z.enum(["BUY", "SELL", "DIVIDEND", "INTEREST", "COUPON", "MATURITY", "SPLIT", "FEE", "TRANSFER_IN", "TRANSFER_OUT", "RETURN_OF_CAPITAL", "ADJUSTMENT", "MERGER_IN", "MERGER_OUT", "RIGHTS_ISSUE", "BONUS"]),
  tradeDate: z.coerce.date(),
  quantity: z.number(),
  price: z.number().min(0),
  brokerage: z.number().min(0).default(0),
  exchangeRate: z.number().positive().default(1),
  currency: z.string().length(3).default("AUD"),
  comments: z.string().max(500).optional(),
});

export type CreateHoldingInput = z.infer<typeof createHoldingSchema>;
```

---

## Task 4: Server Actions for Portfolio CRUD

**File: `src/lib/actions/portfolio.ts`**

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPortfolioSchema, updatePortfolioSchema } from "@/lib/validators/portfolio";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getPortfolios() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.portfolio.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { holdings: true } },
    },
  });
}

export async function getPortfolio(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const portfolio = await db.portfolio.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { shares: { some: { email: session.user.email! } } },
      ],
    },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!portfolio) throw new Error("Portfolio not found");
  return portfolio;
}

export async function createPortfolio(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = createPortfolioSchema.parse(input);

  const portfolio = await db.portfolio.create({
    data: {
      ...data,
      baseCurrency: data.taxResidency === "AU" ? "AUD" : "USD",
      userId: session.user.id,
    },
  });

  revalidatePath("/portfolio");
  redirect(`/portfolio/${portfolio.id}`);
}

export async function updatePortfolio(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = updatePortfolioSchema.parse(input);

  await db.portfolio.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath(`/portfolio/${id}`);
}

export async function deletePortfolio(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.portfolio.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/portfolio");
  redirect("/portfolio");
}
```

**File: `src/lib/actions/transaction.ts`**

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransactionSchema } from "@/lib/validators/transaction";
import { revalidatePath } from "next/cache";

export async function createTransaction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = createTransactionSchema.parse(input);

  // Verify user owns the holding's portfolio
  const holding = await db.holding.findFirst({
    where: {
      id: data.holdingId,
      portfolio: { userId: session.user.id },
    },
  });
  if (!holding) throw new Error("Holding not found");

  const transaction = await db.transaction.create({
    data: {
      ...data,
      quantity: data.quantity,
      price: data.price,
      brokerage: data.brokerage,
      exchangeRate: data.exchangeRate,
    },
  });

  revalidatePath(`/portfolio/${holding.portfolioId}`);
  return transaction;
}

export async function getTransactions(holdingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.transaction.findMany({
    where: {
      holdingId,
      holding: { portfolio: { userId: session.user.id } },
    },
    orderBy: { tradeDate: "desc" },
  });
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tx = await db.transaction.findFirst({
    where: { id },
    include: { holding: { include: { portfolio: true } } },
  });

  if (!tx || tx.holding.portfolio.userId !== session.user.id) {
    throw new Error("Not found");
  }

  await db.transaction.delete({ where: { id } });
  revalidatePath(`/portfolio/${tx.holding.portfolioId}`);
}
```

**File: `src/lib/actions/holding.ts`**

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addHolding(portfolioId: string, data: {
  instrumentCode: string;
  marketCode: string;
  instrumentName?: string;
  instrumentType?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify portfolio ownership
  const portfolio = await db.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Portfolio not found");

  // Find or create instrument
  let instrument = await db.instrument.findUnique({
    where: { code_marketCode: { code: data.instrumentCode, marketCode: data.marketCode } },
  });

  if (!instrument) {
    instrument = await db.instrument.create({
      data: {
        code: data.instrumentCode,
        marketCode: data.marketCode,
        name: data.instrumentName || data.instrumentCode,
        instrumentType: data.instrumentType || "equity",
        currency: data.marketCode === "ASX" ? "AUD" : "USD",
      },
    });
  }

  // Create holding (or return existing)
  const holding = await db.holding.upsert({
    where: {
      portfolioId_instrumentId: { portfolioId, instrumentId: instrument.id },
    },
    create: { portfolioId, instrumentId: instrument.id },
    update: {},
    include: { instrument: true },
  });

  revalidatePath(`/portfolio/${portfolioId}`);
  return holding;
}

export async function deleteHolding(holdingId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const holding = await db.holding.findFirst({
    where: { id: holdingId, portfolio: { userId: session.user.id } },
  });
  if (!holding) throw new Error("Not found");

  await db.holding.delete({ where: { id: holdingId } });
  revalidatePath(`/portfolio/${holding.portfolioId}`);
}
```

---

## Task 5: UI Shell — Layout and Navigation

**File: `src/components/layout/sidebar.tsx`**

Create a sidebar navigation with links to: Dashboard, Portfolio, Reports, Tax, Tools, Analytics, Settings. Use lucide-react icons.

**File: `src/components/layout/header.tsx`**

Create a top header with: portfolio selector dropdown, user avatar/menu, theme toggle.

**File: `src/app/(dashboard)/layout.tsx`**

Wrap all authenticated pages with the sidebar + header layout. Check auth session — redirect to /login if unauthenticated.

**File: `src/app/(auth)/login/page.tsx`**

Login form with email/password + Google OAuth button. Use react-hook-form + zod validation.

**File: `src/app/(auth)/register/page.tsx`**

Registration form: name, email, password, confirm password. Call a server action to create the user with hashed password.

**File: `src/app/(dashboard)/portfolio/page.tsx`**

Portfolio list page showing all user portfolios with name, holdings count, and quick stats.

**File: `src/app/(dashboard)/portfolio/[id]/page.tsx`**

Single portfolio view: holdings table with instrument code, name, quantity, current value, gain/loss, and action buttons.

**File: `src/app/(dashboard)/portfolio/[id]/holdings/[holdingId]/page.tsx`**

Individual holding page: summary, trade history table, add transaction form.

**File: `src/app/(dashboard)/settings/page.tsx`**

Portfolio settings: name, tax entity type, sale allocation method, financial year end.

---

## Task 6: Core UI Components (shadcn/ui)

Create these shadcn/ui components manually (copy the source code — no npx command):

**Files to create in `src/components/ui/`:**
- `button.tsx`
- `input.tsx`
- `label.tsx`
- `card.tsx`
- `table.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `select.tsx`
- `tabs.tsx`
- `toast.tsx` + `toaster.tsx` + `use-toast.ts`
- `badge.tsx`
- `separator.tsx`
- `skeleton.tsx`
- `form.tsx` (wraps react-hook-form)
- `avatar.tsx`
- `sheet.tsx` (mobile sidebar)

Each component follows the standard shadcn/ui pattern: uses `@/lib/utils` cn() function, Radix primitives, and CVA for variants.

> **Note:** Use the exact source from https://ui.shadcn.com/docs/components — these are MIT-licensed copy-paste components.

---

## Task 7: Auth Actions

**File: `src/lib/actions/auth.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function register(input: unknown) {
  const data = registerSchema.parse(input);

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
  });

  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: "/portfolio",
  });
}

export async function login(email: string, password: string) {
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/portfolio",
  });
}
```

---

## Deliverables Checklist

- [ ] Complete Prisma schema with all models
- [ ] NextAuth.js configuration with Google OAuth + Credentials
- [ ] Zod validators for portfolio, holding, transaction
- [ ] Server actions: portfolio CRUD, holding CRUD, transaction CRUD, auth
- [ ] Dashboard layout with sidebar navigation
- [ ] Auth pages (login, register)
- [ ] Portfolio list page
- [ ] Single portfolio page with holdings table
- [ ] Individual holding page with transaction history
- [ ] Settings page
- [ ] All core shadcn/ui components (16 components)
- [ ] TypeScript type augmentation for NextAuth session

## Notes for the Agent

- All server actions use `"use server"` directive
- Always check `auth()` session at the top of every server action
- Use `revalidatePath` after mutations for cache invalidation
- The Prisma schema uses `Decimal` for all monetary values (never float)
- Use `@@index` on frequently queried columns (userId, portfolioId, dates)
- All pages under `(dashboard)` require authentication
- Do NOT import from `@prisma/client` directly — use the singleton from `@/lib/db`
