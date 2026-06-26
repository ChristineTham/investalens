/**
 * One-shot market-data update — the CLI equivalent of the dashboard "Update"
 * button, run for **every user** plus the global reference data.
 *
 * It updates anything that needs updating:
 *   • CPI (RBA G1)                      — global, for CGT indexation / real returns
 *   • Share & ETF prices + dividends    — holdings, benchmarks, model constituents
 *   • Bond prices (FIIG rate sheet)     — bond holdings + model bonds
 *   • Company info / corporate actions  — yfinance backend (dividends, splits, …)
 *
 * The per-user passes reuse the exact same services the dashboard streams
 * (`syncSharePrices` / `syncBondPrices` / `syncStockInfo`), so benchmarks and
 * system models are refreshed too. Everything is incremental and resumable:
 * already-current prices and recently-fetched info are skipped, so re-running
 * after an interruption fills gaps rather than starting from scratch.
 *
 * Usage (run in Codespaces):
 *   pnpm update                     # CPI + market data for all users
 *   pnpm update --skip-cpi          # market data only
 *   pnpm update --skip-info         # skip the company-info phase
 *   pnpm update --cpi-only          # just refresh CPI
 *   pnpm update --user=<id|email>   # restrict to one user
 *   pnpm update --cpi-url=<csv-url> # override the RBA CPI source
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import Papa from "papaparse";
import type { SyncEvent, PhaseKey } from "../lib/services/price-sync";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

// ─── CPI (ported from the former fetch-cpi.ts) ───────────────────────────────

const CPI_URL = "https://www.rba.gov.au/statistics/tables/csv/g1-data.csv";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse the many date shapes RBA/ABS CSVs use into a UTC Date (or null). */
function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));

  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon != null) return new Date(Date.UTC(+m[3], mon, +m[1]));
  }

  m = s.match(/^([A-Za-z]{3,})[-\s](\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon != null) return new Date(Date.UTC(+m[2], mon, 15));
  }

  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

function quarterNumber(d: Date): number {
  return Math.floor(d.getUTCMonth() / 3) + 1;
}
function cpiQuarterKey(d: Date): string {
  return `${d.getUTCFullYear()}-Q${quarterNumber(d)}`;
}
function quarterEndDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), quarterNumber(d) * 3, 0));
}

interface Column {
  index: number;
  title: string;
  units: string;
  seriesId: string;
}

function analyse(rows: string[][]) {
  const labelRowOf = (label: string) =>
    rows.findIndex(
      (r) => (r[0] ?? "").trim().toLowerCase() === label.toLowerCase()
    );

  const titleRow = labelRowOf("Title");
  const unitsRow = labelRowOf("Units");
  const seriesRow = labelRowOf("Series ID");
  const freqRow = labelRowOf("Frequency");

  const dataStart = Math.max(titleRow, unitsRow, seriesRow, freqRow) + 1;
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const columns: Column[] = [];
  for (let c = 1; c < width; c++) {
    columns.push({
      index: c,
      title: (rows[titleRow]?.[c] ?? "").trim(),
      units: (rows[unitsRow]?.[c] ?? "").trim(),
      seriesId: (rows[seriesRow]?.[c] ?? "").trim(),
    });
  }
  return { columns, dataStart };
}

/** Pick the All Groups CPI index column (RBA series GCPIAG). */
function pickColumn(columns: Column[]): Column | undefined {
  const byId = columns.find((c) => c.seriesId.toUpperCase() === "GCPIAG");
  if (byId) return byId;
  return columns.find(
    (c) =>
      /index/i.test(c.units) &&
      /consumer price index|cpi/i.test(c.title) &&
      /all groups/i.test(c.title)
  );
}

async function syncCpi(db: typeof import("../lib/db").db): Promise<void> {
  const url = arg("cpi-url") ?? CPI_URL;
  console.log(`\n▶ CPI — fetching from ${url}`);

  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) {
    console.error(`  ✗ CPI download failed: HTTP ${res.status} ${res.statusText}`);
    return;
  }
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const rows = parsed.data as string[][];
  if (!rows.length) {
    console.error("  ✗ CPI CSV parsed to zero rows — unexpected format.");
    return;
  }

  const { columns, dataStart } = analyse(rows);
  const column = pickColumn(columns);
  if (!column) {
    console.error("  ✗ Could not identify the All Groups CPI column.");
    return;
  }

  const byQuarter = new Map<
    string,
    { quarterEnd: Date; label: string; value: number }
  >();
  for (let r = dataStart; r < rows.length; r++) {
    const date = parseDate(rows[r]?.[0] ?? "");
    if (!date) continue;
    const raw = (rows[r][column.index] ?? "").trim().replace(/,/g, "");
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    const label = cpiQuarterKey(date);
    byQuarter.set(label, { quarterEnd: quarterEndDate(date), label, value });
  }

  const observations = [...byQuarter.values()].sort(
    (a, b) => a.quarterEnd.getTime() - b.quarterEnd.getTime()
  );
  if (observations.length === 0) {
    console.error("  ✗ No CPI observations parsed — check the source format.");
    return;
  }

  for (const o of observations) {
    await db.cpiIndex.upsert({
      where: { quarterEnd: o.quarterEnd },
      create: {
        quarterEnd: o.quarterEnd,
        label: o.label,
        indexValue: o.value,
        source: "RBA G1",
      },
      update: { label: o.label, indexValue: o.value, source: "RBA G1" },
    });
  }
  const last = observations[observations.length - 1];
  console.log(
    `  ✓ CPI — upserted ${observations.length} quarters (latest ${last.label} = ${last.value}).`
  );
}

// ─── Per-user market sync (mirrors the dashboard Update button) ──────────────

/** A terminal renderer for the streamed {@link SyncEvent}s. */
function makeEmitter() {
  const isTTY = Boolean(process.stdout.isTTY);
  const BAR = 24;
  let total = 0;

  function bar(current: number, label: string) {
    const pct = total > 0 ? current / total : 0;
    const filled = Math.round(pct * BAR);
    const body = `    [${"█".repeat(filled)}${"░".repeat(BAR - filled)}] ${current}/${total} ${label}`;
    if (isTTY) process.stdout.write(`\r\x1b[K${body}`);
    else if (total > 0 && (current === total || current % 25 === 0)) console.log(body);
  }

  function summarise(section: PhaseKey, data: unknown): string {
    const d = data as Record<string, number>;
    if (section === "shares") return `+${d.fetched ?? 0} prices, ${d.failed ?? 0} failed`;
    if (section === "bonds")
      return `${d.updated ?? 0} updated, ${d.carriedForward ?? 0} carried, ${d.unmatched ?? 0} unmatched`;
    if (section === "info") return `${d.updated ?? 0} updated, ${d.failed ?? 0} failed`;
    return "";
  }

  return (event: SyncEvent) => {
    switch (event.type) {
      case "phase":
        total = event.total;
        if (isTTY) process.stdout.write("\r\x1b[K");
        console.log(`  ▶ ${event.label} (${event.total})`);
        break;
      case "item":
        bar(event.current, event.label);
        break;
      case "result":
        if (isTTY) process.stdout.write("\r\x1b[K");
        console.log(`  ✓ ${event.section}: ${summarise(event.section, event.data)}`);
        break;
      case "error":
        if (isTTY) process.stdout.write("\r\x1b[K");
        console.log(`  ✗ ${event.section}: ${event.message}`);
        break;
    }
  };
}

async function main() {
  const { db } = await import("../lib/db");
  const { syncSharePrices, syncBondPrices, syncStockInfo } = await import(
    "../lib/services/price-sync"
  );

  const cpiOnly = flag("cpi-only");
  const skipCpi = flag("skip-cpi");
  const skipInfo = flag("skip-info");
  const userFilter = arg("user");

  // 1. Global reference data: CPI.
  if (!skipCpi) await syncCpi(db);

  if (cpiOnly) {
    await db.$disconnect();
    return;
  }

  // 2. Per-user market data. The first pass also refreshes benchmarks and
  //    system models (they aren't user-scoped); later users skip them as the
  //    sync is incremental. With no users we still run one "system" pass so
  //    benchmarks and system models update.
  const users = await db.user.findMany({
    where: userFilter
      ? { OR: [{ id: userFilter }, { email: userFilter }] }
      : undefined,
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const targets =
    users.length > 0
      ? users
      : userFilter
        ? []
        : [{ id: "__system__", email: null, name: "system (no users)" }];

  if (targets.length === 0) {
    console.error(`\nNo user matched "${userFilter}". Nothing to update.`);
    await db.$disconnect();
    process.exit(1);
  }

  console.log(
    `\nUpdating market data for ${targets.length} ${targets.length === 1 ? "user" : "users"}...`
  );

  for (let i = 0; i < targets.length; i++) {
    const user = targets[i];
    const who = user.email || user.name || user.id;
    console.log(`\n[${i + 1}/${targets.length}] ${who}`);
    const emit = makeEmitter();

    try {
      await syncSharePrices(user.id, emit);
    } catch (err) {
      console.log(`  ✗ shares: ${err instanceof Error ? err.message : err}`);
    }
    try {
      await syncBondPrices(user.id, emit);
    } catch (err) {
      console.log(`  ✗ bonds: ${err instanceof Error ? err.message : err}`);
    }
    if (!skipInfo) {
      try {
        await syncStockInfo(user.id, emit);
      } catch (err) {
        console.log(`  ✗ info: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  console.log(`\n${"─".repeat(50)}\nUpdate complete.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
