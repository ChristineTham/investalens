# InvestaLens — Installed Agents & Skills

## Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **Explore** | Fast read-only codebase exploration and Q&A | Searching for code, understanding structure, answering questions about the codebase without making changes. Specify thoroughness: quick, medium, or thorough. |

---

## Skills (by Category)

### Project-Relevant Skills

These skills directly apply to InvestaLens's tech stack (Next.js, Prisma, Neon, shadcn/ui, Vercel, NextAuth).

| Skill | When to Use |
|-------|-------------|
| **next-best-practices** | Writing Next.js code — file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers |
| **next-cache-components** | Implementing PPR, `use cache` directive, `cacheLife`, `cacheTag`, migration from `unstable_cache` |
| **next-upgrade** | Upgrading Next.js to a newer version |
| **next-browser** | Debugging React component trees, props, hooks, PPR shells, errors from the CLI |
| **nextauth-authentication** | Implementing NextAuth.js (Auth.js v5) — session management, providers, security |
| **prisma-cli** | Running Prisma CLI commands — init, generate, migrate, db push, studio |
| **prisma-client-api** | Writing Prisma queries — findMany, create, update, delete, transactions, filters |
| **prisma-database-setup** | Configuring Prisma with PostgreSQL (or other databases), connection troubleshooting |
| **prisma-postgres** | Working with Prisma Postgres — Console, create-db CLI, Management API |
| **prisma-postgres-setup** | Setting up a new Prisma Postgres database and getting a connection string |
| **prisma-upgrade-v7** | Migrating from Prisma v6 to v7 (breaking changes, driver adapters) |
| **prisma-driver-adapter-implementation** | Implementing or modifying Prisma driver adapters (v7 contracts) |
| **neon-postgres** | Neon setup, connection, branching, autoscaling, scale-to-zero, pooling, CLI |
| **neon-postgres-branches** | Creating Neon branches for testing, migration testing, schema-only workflows |
| **neon-postgres-egress-optimizer** | Diagnosing high database egress costs, optimizing queries to reduce data transfer |
| **neon-serverless** | Configuring `@neondatabase/serverless` for Edge/serverless environments |
| **neon-auth** | Setting up Neon Auth (authentication routes, UI components) |
| **neon-drizzle** | Setting up Drizzle ORM with Neon (alternative to Prisma) |
| **neon-js** | Neon JS SDK with unified auth and PostgREST-style queries |
| **neon-toolkit** | Creating ephemeral Neon databases for testing/CI |
| **claimable-postgres** | Instant temporary Postgres via neon.new (no signup needed) |
| **add-neon-docs** | Adding Neon best practices references to project AI documentation |
| **shadcn** | shadcn/ui CLI, component installation, composition, custom registries, theming |
| **tailwind-design-system** | Building design systems with Tailwind CSS v4, design tokens, component libraries |
| **building-components** | Building accessible, composable UI components with proper APIs |
| **ai-sdk** | Vercel AI SDK — chat interfaces, text generation, structured output, tool calling, streaming, embeddings |
| **ai-elements** | Building AI chat interfaces using ai-elements components (conversations, messages, prompts) |
| **auth** | Authentication with Clerk, Descope, or Auth0 in Next.js (middleware, sign-in flows) |
| **fastapi** | FastAPI best practices and Pydantic models (for Python serverless functions) |

### Vercel Platform Skills

| Skill | When to Use |
|-------|-------------|
| **deploy-to-vercel** | Deploying the app — "deploy my app", "push this live", "create a preview deployment" |
| **vercel-cli-with-tokens** | Using Vercel CLI with access tokens (non-interactive auth) |
| **vercel-optimize** | Reducing Vercel costs, improving performance, caching, Core Web Vitals |
| **env-vars** | Managing .env files, `vercel env` commands, OIDC tokens |
| **routing-middleware** | Request interception before cache — rewrites, redirects, personalization |
| **runtime-cache** | Vercel Runtime Cache API — per-region KV cache with tag-based invalidation |
| **bootstrap** | Setting up repo with Vercel-linked resources (databases, auth, integrations) |
| **verification** | End-to-end verification: browser → API → data → response |

### React & Frontend Skills

| Skill | When to Use |
|-------|-------------|
| **vercel-react-best-practices** | React/Next.js performance optimization from Vercel Engineering |
| **vercel-composition-patterns** | Refactoring component APIs — compound components, render props, context |
| **vercel-react-view-transitions** | Page transitions, shared element animations, route change animations |
| **vercel-react-native-skills** | React Native/Expo mobile development (not applicable to this project) |
| **web-design-guidelines** | Reviewing UI code for Web Interface Guidelines compliance, accessibility audit |
| **writing-guidelines** | Reviewing documentation prose for style, voice, and tone |

### Azure Skills

Not directly applicable to InvestaLens (Vercel deployment), but available if migrating to Azure later.

| Skill | When to Use |
|-------|-------------|
| **azure-prepare** | Preparing apps for Azure deployment (Bicep/Terraform, azure.yaml, Dockerfiles) |
| **azure-deploy** | Executing Azure deployments (azd up, terraform apply) |
| **azure-validate** | Pre-deployment validation for Azure readiness |
| **azure-diagnostics** | Debugging Azure production issues (AppLens, Monitor, resource health) |
| **azure-kubernetes** | Planning/creating AKS clusters |
| **azure-compute** | Azure VM/VMSS recommendations, pricing, troubleshooting |
| **azure-cost** | Azure cost queries, forecasting, optimization |
| **azure-compliance** | Azure compliance/security audits |
| **azure-reliability** | Assessing reliability posture (zone redundancy, multi-region) |
| **azure-storage** | Blob Storage, File Shares, Queue, Table, Data Lake |
| **azure-resource-lookup** | Listing and finding Azure resources |
| **azure-resource-visualizer** | Generating Mermaid architecture diagrams of Azure resources |
| **azure-rbac** | Finding least-privilege Azure RBAC roles |
| **azure-quotas** | Checking Azure quotas and usage |
| **azure-cloud-migrate** | Cross-cloud migration to Azure (Lambda→Functions, etc.) |
| **azure-upgrade** | Upgrading Azure workload plans/tiers/SKUs |
| **azure-enterprise-infra-planner** | Enterprise Azure infrastructure architecture |
| **azure-ai** | Azure AI Search, Speech, OpenAI, Document Intelligence |
| **azure-aigateway** | Azure API Management as AI Gateway |
| **azure-kusto** | KQL queries for Azure Data Explorer |
| **azure-messaging** | Troubleshooting Event Hubs and Service Bus SDKs |
| **azure-hosted-copilot-sdk** | Building GitHub Copilot SDK apps on Azure |
| **airunway-aks-setup** | AI model serving on AKS (KAITO, vLLM) |
| **appinsights-instrumentation** | Application Insights telemetry setup |

### Microsoft Identity & AI Skills

| Skill | When to Use |
|-------|-------------|
| **entra-app-registration** | Microsoft Entra ID app registration, OAuth 2.0, MSAL |
| **entra-agent-id** | Microsoft Entra Agent Identity (fmi_path, OBO, cross-tenant) |
| **microsoft-foundry** | Deploying/evaluating/fine-tuning Foundry agents |

### Utility Skills

| Skill | When to Use |
|-------|-------------|
| **find-skills** | Discovering what skills are available for a task |

---

## Quick Reference for InvestaLens Development

| Task | Skill to Invoke |
|------|-----------------|
| Write a new Next.js page | `next-best-practices` |
| Add a shadcn/ui component | `shadcn` |
| Write a Prisma query | `prisma-client-api` |
| Run a migration | `prisma-cli` |
| Set up NextAuth | `nextauth-authentication` |
| Implement caching | `next-cache-components` + `runtime-cache` |
| Deploy to Vercel | `deploy-to-vercel` |
| Build AI chat feature | `ai-sdk` + `ai-elements` |
| Optimize performance | `vercel-optimize` + `vercel-react-best-practices` |
| Debug end-to-end flow | `verification` + `next-browser` |
| Review UI accessibility | `web-design-guidelines` |
| Configure environment vars | `env-vars` |
| Set up Neon database | `neon-postgres` or `neon-serverless` |
| Test with temp database | `claimable-postgres` or `neon-toolkit` |
