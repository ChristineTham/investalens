/**
 * Default (system) model-portfolio library.
 *
 * Single source of truth consumed by `scripts/seed-models.ts`. Every model is
 * seeded with `userId = null` / `isSystem = true` and is read-only to all users.
 *
 * ── Documentation-first / verification note ──────────────────────────────────
 * The ETF tickers, ASX-20/50 membership and any weights below are a STARTING
 * SPECIFICATION. Before seeding (P2, Codespaces) verify each ticker exists on
 * Yahoo Finance and that index membership is current, then record findings in
 * docs/KNOWLEDGE.md. The seed guard (`scripts/validate-models.ts`) rejects any
 * model containing a delisted / period-invalid constituent, so broken defaults
 * cannot ship.
 *
 * Known casualty already removed: NCM (Newcrest — acquired by Newmont, delisted
 * Nov 2023). The ASX-20 20th slot is QBE; verify against a live source in P2.
 */

export interface DefaultConstituent {
  /** ASX ticker WITHOUT suffix, as stored in Instrument.code (e.g. "VAS"). */
  code: string;
  marketCode: string; // "ASX"
  name: string;
  weight: number; // 0..1; per-model constituent weights sum to 1
  /** "etf" (default) or "equity" for direct shares. */
  instrumentType?: string;
}

export type ModelCategory =
  | "conservative"
  | "moderately_conservative"
  | "balanced"
  | "growth"
  | "high_growth"
  | "high_yield"
  | "index";

export interface DefaultModel {
  slug: string; // stable unique id
  name: string;
  category: ModelCategory;
  provider: "Vanguard" | "Betashares" | "ASX" | "Custom";
  description: string;
  notionalCapital?: number; // default 1_000_000
  minCashWeight?: number; // default 0
  constituents: DefaultConstituent[];
  /**
   * When true the seed script computes constituent weights from market cap
   * (InstrumentInfo.marketCap), falling back to equal weight with a warning.
   * The `weight` values supplied here are ignored in that case.
   */
  marketWeighted?: boolean;
}

// ─── 1a. Diversified blended ETF strategies (Stockspot-style 5-asset) ─────────

interface BlendRow {
  slug: string;
  name: string;
  category: ModelCategory;
  description: string;
  minCash: number;
  // VAS, VGS, VGE, VAF, GOLD (percent, sum to 100)
  vas: number;
  vgs: number;
  vge: number;
  vaf: number;
  gold: number;
}

const BLEND_NAMES: Record<string, string> = {
  VAS: "Vanguard Australian Shares Index ETF",
  VGS: "Vanguard MSCI Index International Shares ETF",
  VGE: "Vanguard FTSE Emerging Markets Shares ETF",
  VAF: "Vanguard Australian Fixed Interest Index ETF",
  GOLD: "Global X Physical Gold",
};

const BLEND_ROWS: BlendRow[] = [
  { slug: "blend-conservative", name: "Diversified Conservative", category: "conservative", description: "Defensive 5-ETF blend (~30% growth assets) for capital preservation.", minCash: 0.05, vas: 12, vgs: 13, vge: 5, vaf: 60, gold: 10 },
  { slug: "blend-moderately-conservative", name: "Diversified Moderately Conservative", category: "moderately_conservative", description: "Lower-risk 5-ETF blend (~45% growth assets).", minCash: 0.03, vas: 18, vgs: 20, vge: 7, vaf: 45, gold: 10 },
  { slug: "blend-balanced", name: "Diversified Balanced", category: "balanced", description: "Balanced 5-ETF blend (~60% growth assets).", minCash: 0.02, vas: 24, vgs: 27, vge: 9, vaf: 32, gold: 8 },
  { slug: "blend-growth", name: "Diversified Growth", category: "growth", description: "Growth-tilted 5-ETF blend (~78% growth assets).", minCash: 0, vas: 30, vgs: 34, vge: 12, vaf: 19, gold: 5 },
  { slug: "blend-high-growth", name: "Diversified High Growth", category: "high_growth", description: "Aggressive 5-ETF blend (~95% growth assets).", minCash: 0, vas: 36, vgs: 42, vge: 15, vaf: 5, gold: 2 },
];

function blendModel(r: BlendRow): DefaultModel {
  const make = (code: keyof typeof BLEND_NAMES, pct: number): DefaultConstituent => ({
    code,
    marketCode: "ASX",
    name: BLEND_NAMES[code],
    weight: pct / 100,
    instrumentType: "etf",
  });
  return {
    slug: r.slug,
    name: r.name,
    category: r.category,
    provider: "Custom",
    description: r.description,
    minCashWeight: r.minCash,
    constituents: [
      make("VAS", r.vas),
      make("VGS", r.vgs),
      make("VGE", r.vge),
      make("VAF", r.vaf),
      make("GOLD", r.gold),
    ],
  };
}

const BLEND_MODELS = BLEND_ROWS.map(blendModel);

// ─── 1b. All-in-one single-fund ETF strategies ────────────────────────────────

function singleFundModel(
  slug: string,
  name: string,
  category: ModelCategory,
  provider: DefaultModel["provider"],
  code: string,
  fundName: string,
  description: string
): DefaultModel {
  return {
    slug,
    name,
    category,
    provider,
    description,
    constituents: [
      { code, marketCode: "ASX", name: fundName, weight: 1, instrumentType: "etf" },
    ],
  };
}

const SINGLE_FUND_MODELS: DefaultModel[] = [
  singleFundModel("vanguard-vdco", "Vanguard Diversified Conservative", "conservative", "Vanguard", "VDCO", "Vanguard Diversified Conservative Index ETF", "All-in-one conservative diversified fund (~30% growth assets)."),
  singleFundModel("vanguard-vdba", "Vanguard Diversified Balanced", "balanced", "Vanguard", "VDBA", "Vanguard Diversified Balanced Index ETF", "All-in-one balanced diversified fund (~50% growth assets)."),
  singleFundModel("vanguard-vdgr", "Vanguard Diversified Growth", "growth", "Vanguard", "VDGR", "Vanguard Diversified Growth Index ETF", "All-in-one growth diversified fund (~70% growth assets)."),
  singleFundModel("vanguard-vdhg", "Vanguard Diversified High Growth", "high_growth", "Vanguard", "VDHG", "Vanguard Diversified High Growth Index ETF", "All-in-one high-growth diversified fund (~90% growth assets)."),
  singleFundModel("betashares-dhhf", "Betashares Diversified All Growth", "high_growth", "Betashares", "DHHF", "Betashares Diversified All Growth ETF", "All-in-one 100% growth diversified fund."),
];

// ─── 1c. Income / high-yield model ────────────────────────────────────────────

const INCOME_MODEL: DefaultModel = {
  slug: "income-high-yield",
  name: "Australian Income & High Yield",
  category: "high_yield",
  provider: "Custom",
  description: "Income-tilted blend of high-yield and dividend ETFs with a defensive sleeve.",
  constituents: [
    { code: "VHY", marketCode: "ASX", name: "Vanguard Australian Shares High Yield ETF", weight: 0.45, instrumentType: "etf" },
    { code: "IHD", marketCode: "ASX", name: "iShares S&P/ASX Dividend Opportunities ETF", weight: 0.2, instrumentType: "etf" },
    { code: "RDV", marketCode: "ASX", name: "Betashares Australian Dividend Harvester Fund", weight: 0.15, instrumentType: "etf" },
    { code: "VGS", marketCode: "ASX", name: "Vanguard MSCI Index International Shares ETF", weight: 0.1, instrumentType: "etf" },
    { code: "VAF", marketCode: "ASX", name: "Vanguard Australian Fixed Interest Index ETF", weight: 0.1, instrumentType: "etf" },
  ],
};

// ─── 1d. Direct-share ASX index models ────────────────────────────────────────
// Verify membership against a current source in P2. NCM (delisted 2023) removed;
// QBE fills the 20th ASX-20 slot.

interface Ticker {
  code: string;
  name: string;
}

/** S&P/ASX 20 universe (current-ish; verify in P2). Ordered by market cap. */
const ASX_20: Ticker[] = [
  { code: "CBA", name: "Commonwealth Bank of Australia" },
  { code: "BHP", name: "BHP Group" },
  { code: "CSL", name: "CSL Limited" },
  { code: "NAB", name: "National Australia Bank" },
  { code: "WBC", name: "Westpac Banking Corporation" },
  { code: "ANZ", name: "ANZ Group Holdings" },
  { code: "MQG", name: "Macquarie Group" },
  { code: "WES", name: "Wesfarmers" },
  { code: "GMG", name: "Goodman Group" },
  { code: "FMG", name: "Fortescue" },
  { code: "TLS", name: "Telstra Group" },
  { code: "WOW", name: "Woolworths Group" },
  { code: "TCL", name: "Transurban Group" },
  { code: "RIO", name: "Rio Tinto" },
  { code: "ALL", name: "Aristocrat Leisure" },
  { code: "WDS", name: "Woodside Energy Group" },
  { code: "COL", name: "Coles Group" },
  { code: "STO", name: "Santos" },
  { code: "S32", name: "South32" },
  { code: "QBE", name: "QBE Insurance Group" },
];

/** Additional S&P/ASX 50 names beyond the ASX-20 (verify in P2). */
const ASX_50_EXTRA: Ticker[] = [
  { code: "REA", name: "REA Group" },
  { code: "COH", name: "Cochlear" },
  { code: "BXB", name: "Brambles" },
  { code: "JHX", name: "James Hardie Industries" },
  { code: "SUN", name: "Suncorp Group" },
  { code: "ORG", name: "Origin Energy" },
  { code: "NST", name: "Northern Star Resources" },
  { code: "FPH", name: "Fisher & Paykel Healthcare" },
  { code: "SCG", name: "Scentre Group" },
  { code: "WTC", name: "WiseTech Global" },
  { code: "XRO", name: "Xero" },
  { code: "ASX", name: "ASX Limited" },
  { code: "RHC", name: "Ramsay Health Care" },
  { code: "SHL", name: "Sonic Healthcare" },
  { code: "AMC", name: "Amcor" },
  { code: "IAG", name: "Insurance Australia Group" },
  { code: "MPL", name: "Medibank Private" },
  { code: "CPU", name: "Computershare" },
  { code: "SGP", name: "Stockland" },
  { code: "QAN", name: "Qantas Airways" },
  { code: "RMD", name: "ResMed" },
  { code: "PME", name: "Pro Medicus" },
  { code: "CAR", name: "CAR Group" },
  { code: "SOL", name: "Washington H. Soul Pattinson" },
  { code: "MIN", name: "Mineral Resources" },
  { code: "TLC", name: "Lottery Corporation" },
  { code: "EVN", name: "Evolution Mining" },
  { code: "APA", name: "APA Group" },
  { code: "GPT", name: "GPT Group" },
  { code: "AGL", name: "AGL Energy" },
];

const ASX_10 = ASX_20.slice(0, 10);
const ASX_50 = [...ASX_20, ...ASX_50_EXTRA];

/** Build an equal-weight direct-share index model from a ticker list. */
export function equalWeightModel(
  slug: string,
  name: string,
  tickers: Ticker[],
  description?: string
): DefaultModel {
  const w = 1 / tickers.length;
  return {
    slug,
    name,
    category: "index",
    provider: "ASX",
    description:
      description ??
      `${tickers.length} largest ASX companies, equal weighted.`,
    constituents: tickers.map((t) => ({
      code: t.code,
      marketCode: "ASX",
      name: t.name,
      weight: w,
      instrumentType: "equity",
    })),
  };
}

const INDEX_MODELS: DefaultModel[] = [
  equalWeightModel(
    "asx10-equal",
    "ASX 10 Equal Weight",
    ASX_10,
    "Ten largest ASX companies, equal weighted (10% each)."
  ),
  equalWeightModel(
    "asx20-equal",
    "ASX 20 Equal Weight",
    ASX_20,
    "S&P/ASX 20 constituents, equal weighted (5% each)."
  ),
  // Market-cap weighted ASX 20 — weights computed at seed time from market cap.
  {
    ...equalWeightModel(
      "asx20-market",
      "ASX 20 Market Weight",
      ASX_20,
      "S&P/ASX 20 constituents, market-cap weighted."
    ),
    marketWeighted: true,
  },
  equalWeightModel(
    "asx50-equal",
    "ASX 50 Equal Weight",
    ASX_50,
    "S&P/ASX 50 constituents, equal weighted (2% each)."
  ),
];

// ─── Combined library ─────────────────────────────────────────────────────────

export const DEFAULT_MODELS: DefaultModel[] = [
  ...BLEND_MODELS,
  ...SINGLE_FUND_MODELS,
  INCOME_MODEL,
  ...INDEX_MODELS,
];
