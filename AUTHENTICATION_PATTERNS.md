# InvestaLens Authentication Patterns

This document outlines the authentication patterns used in InvestaLens for client-side components and API communication.

## Overview

InvestaLens uses a **hybrid authentication approach**:
1. **Server Actions** (Primary) - Client components call server actions for data operations
2. **NextAuth.js** - Session-based authentication for user login/signup
3. **Bearer Token Authentication** - For external API access (`/api/v1/*` routes)

---

## 1. Server Actions Pattern (Primary)

### Pattern Flow
1. Client component (`"use client"`) calls a server action function (`"use server"`)
2. Server action automatically gets the current session via `await auth()`
3. Server validates user and performs database operations
4. No explicit headers or tokens needed in client code

### Code Locations
- **Server Actions**: `lib/actions/*.ts`
- **Auth Configuration**: `lib/auth.ts`
- **Database**: `lib/db.ts`

---

## 2. Client-to-Server Action Examples

### Example 1: Registration with Server Action

**File**: [app/(auth)/register/page.tsx](app/(auth)/register/page.tsx)

```typescript
"use client";

import { useState } from "react";
import { register } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      // Direct server action call - no manual authentication needed
      await register({ name, email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form JSX */}
    </form>
  );
}
```

**Server Action** ([lib/actions/auth.ts](lib/actions/auth.ts)):

```typescript
"use server";

import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";

export async function register(input: unknown) {
  const data = registerSchema.parse(input);

  // Automatic validation - no manual token handling
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

  // Sign user in after registration
  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: "/portfolio",
  });
}
```

---

### Example 2: Creating a Transaction with Server Action

**File**: [components/forms/add-transaction-form.tsx](components/forms/add-transaction-form.tsx)

```typescript
"use client";

import { createTransaction } from "@/lib/actions/transaction";

export function AddTransactionForm({ holdingId, currency }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    try {
      // Call server action - authentication happens automatically
      await createTransaction({
        holdingId,
        transactionType: form.get("transactionType") as string,
        tradeDate: form.get("tradeDate") as string,
        quantity: Number(form.get("quantity")),
        price: Number(form.get("price")),
        brokerage: Number(form.get("brokerage") || 0),
        currency,
      });
      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return <form onSubmit={handleSubmit}>{/* Form JSX */}</form>;
}
```

**Server Action** ([lib/actions/transaction.ts](lib/actions/transaction.ts)):

```typescript
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransactionSchema } from "@/lib/validators/transaction";

export async function createTransaction(input: unknown) {
  // ✅ Automatic session retrieval - no manual auth headers needed
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = createTransactionSchema.parse(input);

  // ✅ Validation using session user ID
  const holding = await db.holding.findFirst({
    where: {
      id: data.holdingId,
      portfolio: { userId: session.user.id }, // ← Scope check
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
```

**Key Pattern**:
- ✅ No `Authorization` headers in client code
- ✅ No token passing from client to server
- ✅ Session automatically available in server action via `await auth()`
- ✅ User scope validation happens server-side
- ✅ Error handling via try/catch

---

### Example 3: Portfolio Actions (Read + Modify)

**File**: [components/forms/portfolio-actions.tsx](components/forms/portfolio-actions.tsx)

```typescript
"use client";

import { updatePortfolio, deletePortfolio } from "@/lib/actions/portfolio";

export function PortfolioActions({ portfolioId, currentName }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Server action call - automatic authentication
    await updatePortfolio(portfolioId, { name });
    
    setEditing(false);
    setLoading(false);
    window.location.reload();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${currentName}"?`)) return;
    // Another server action - same auth pattern
    await deletePortfolio(portfolioId);
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => setEditing(true)}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

---

## 3. NextAuth.js Session Pattern

### Using Session in Client Components

**File**: [components/layout/header.tsx](components/layout/header.tsx)

```typescript
"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export function Header() {
  // ✅ Hook-based session access in client components
  const { data: session } = useSession();

  return (
    <header>
      {session?.user && (
        <div className="flex items-center gap-3">
          <span>{session.user.name || session.user.email}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
```

### Auth Configuration

**File**: [lib/auth.ts](lib/auth.ts)

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" }, // ✅ JWT-based sessions
  pages: {
    signIn: "/login",
    newUser: "/portfolio",
  },
  providers: [
    // OAuth provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Credentials provider for email/password
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
});
```

---

## 4. Bearer Token Authentication for Public API

### Pattern for External API Access

InvestaLens also provides a public REST API with Bearer token authentication for external integrations.

**File**: [app/api/v1/portfolios/route.ts](app/api/v1/portfolios/route.ts)

```typescript
import { authenticateApiRequest, hasScope, jsonError, jsonSuccess } from "@/lib/api/middleware";

export async function GET(request: Request) {
  // ✅ Manual token extraction from Authorization header
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  
  // ✅ Scope validation
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const portfolios = await db.portfolio.findMany({
    where: { userId: auth.userId },
  });

  return jsonSuccess(portfolios);
}
```

### API Middleware

**File**: [lib/api/middleware.ts](lib/api/middleware.ts)

```typescript
export async function authenticateApiRequest(
  request: Request
): Promise<{ userId: string; scope: string } | null> {
  // ✅ Extract Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  // ✅ Extract and validate token
  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
  });

  if (!apiToken) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

  // ✅ Record token usage
  await db.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsed: new Date() },
  });

  return { userId: apiToken.userId, scope: apiToken.scope };
}

export function hasScope(
  userScope: string,
  required: "read" | "write" | "admin"
): boolean {
  const levels = ["read", "write", "admin"];
  return levels.indexOf(userScope) >= levels.indexOf(required);
}
```

---

## 5. Client-Side Fetch Pattern (For External API Calls)

If a client component needs to call the public API directly (less common), the pattern would be:

```typescript
"use client";

import { useEffect, useState } from "react";

export function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/api/v1/portfolios", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch");
      
      const result = await response.json();
      setData(result.data);
    }

    fetchData();
  }, []);

  return <div>{/* Render data */}</div>;
}
```

**⚠️ Security Note**: Avoid putting actual API tokens in environment variables or client code. Use server actions instead.

---

## 6. Instrument Search with useEffect

**File**: [components/forms/instrument-search.tsx](components/forms/instrument-search.tsx)

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { searchInstruments } from "@/lib/providers/instrument-search";

export function InstrumentSearch({ market, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.length < 1) return;

    // Debounced search call
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      // ✅ Server-side search function (not a direct fetch)
      const instruments = await searchInstruments(query, market);
      setResults(instruments);
      setLoading(false);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, market]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search instruments..."
      />
      {/* Results display */}
    </div>
  );
}
```

---

## Authentication Flow Summary

### For User-Facing Features
```
Client Component ("use client")
    ↓
Server Action ("use server")
    ↓
Auth Check: await auth()
    ↓
Session User ID Available
    ↓
Database Query with User Scope
    ↓
Return Data to Client
```

### For External API Integration
```
External Application
    ↓
HTTP Request with Authorization: Bearer Token
    ↓
API Route Handler (/api/v1/*)
    ↓
Auth Check: authenticateApiRequest()
    ↓
Token Hash Validation
    ↓
Scope Validation
    ↓
Database Query with User Scope
    ↓
Return JSON Response
```

---

## Key Authentication Patterns

### ✅ DO: Use Server Actions

```typescript
// Client
async function handleClick() {
  await myServerAction(data);
}

// Server
"use server"
export async function myServerAction(data) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  // ...
}
```

### ✅ DO: Check Session in Server Actions

```typescript
const session = await auth();
if (!session?.user?.id) throw new Error("Unauthorized");

// Scope check
const portfolio = await db.portfolio.findFirst({
  where: {
    id: portfolioId,
    userId: session.user.id, // ← Scope to current user
  },
});
```

### ✅ DO: Use Bearer Tokens for API Routes

```typescript
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return jsonError("unauthorized", "", 401);
  
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "", 403);
  
  // ...
}
```

### ❌ DON'T: Send Tokens in Client Code

```typescript
// ❌ BAD - Token exposed in client code
const response = await fetch("/api/v1/portfolios", {
  headers: {
    Authorization: `Bearer ${mySecret}`,
  },
});
```

### ❌ DON'T: Skip Authorization Checks

```typescript
// ❌ BAD - No auth check
export async function deletePortfolio(id: string) {
  await db.portfolio.delete({ where: { id } });
}

// ✅ GOOD
export async function deletePortfolio(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!portfolio) throw new Error("Not found");
  
  await db.portfolio.delete({ where: { id } });
}
```

---

## References

- **NextAuth.js Docs**: https://next-auth.js.org/
- **NextAuth Adapters**: https://authjs.dev/reference/adapter/prisma
- **Next.js Server Actions**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- **API Documentation**: [docs/API.md](docs/API.md)

