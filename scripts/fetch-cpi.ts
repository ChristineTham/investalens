/**
 * Fetch quarterly CPI (All Groups) from RBA Statistical Table G1 and upsert it
 * into the `CpiIndex` table. Used for CGT cost-base indexation and real returns.
 *
 * Usage (run in Codespaces):
 *   npx tsx scripts/fetch-cpi.ts            # fetch + upsert
 *   npx tsx scripts/fetch-cpi.ts --dry-run  # parse + summarise, no DB writes
 *   npx tsx scripts/fetch-cpi.ts --verify   # upsert, then print sample factors
 *   npx tsx scripts/fetch-cpi.ts --series=GCPIAG   # force a Series ID column
 *   npx tsx scripts/fetch-cpi.ts --col=3           # force a column index
 *   npx tsx scripts/fetch-cpi.ts --url=<csv-url>    # override source URL
 *
 * Source: https://www.rba.gov.au/statistics/tables/csv/g1-data.csv
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import Papa from "papaparse";

const DEFAULT_URL = "https://www.rba.gov.au/statistics/tables/csv/g1-data.csv";

function arg(name: string): string | undefined {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=")[1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

// ─── Date / quarter helpers (mirror lib/calculations/indexation.ts) ──────────

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse the many date shapes RBA/ABS CSVs use into a UTC Date (or null). */
function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

  // DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));

  // DD-Mon-YYYY or D Mon YYYY
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon != null) return new Date(Date.UTC(+m[3], mon, +m[1]));
  }

  // Mon-YYYY or Mon YYYY
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

// ─── CSV column detection ────────────────────────────────────────────────────

interface Column {
  index: number;
  title: string;
  units: string;
  seriesId: string;
}

/** Locate label rows and the data start, then describe each data column. */
function analyse(rows: string[][]) {
  const labelRowOf = (label: string) =>
    rows.findIndex((r) => (r[0] ?? "").trim().toLowerCase() === label.toLowerCase());

  const titleRow = labelRowOf("Title");
  const unitsRow = labelRowOf("Units");
  const seriesRow = labelRowOf("Series ID");
  const freqRow = labelRowOf("Frequency");

  const headerEnd = Math.max(titleRow, unitsRow, seriesRow, freqRow);
  const dataStart = headerEnd + 1;

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
  return { columns, dataStart, seriesRow };
}

/** Pick the All Groups CPI index column, honouring CLI overrides. */
function pickColumn(columns: Column[]): Column | undefined {
  const forcedCol = arg("col");
  if (forcedCol) return columns.find((c) => c.index === Number(forcedCol));

  const forcedSeries = arg("series");
  if (forcedSeries) {
    return columns.find(
      (c) => c.seriesId.toUpperCase() === forcedSeries.toUpperCase()
    );
  }

  // Preferred RBA series ID for All Groups CPI index numbers.
  const byId = columns.find((c) => c.seriesId.toUpperCase() === "GCPIAG");
  if (byId) return byId;

  // Fall back to a column whose units are index numbers and whose title looks
  // like the All Groups CPI level.
  return columns.find(
    (c) =>
      /index/i.test(c.units) &&
      /consumer price index|cpi/i.test(c.title) &&
      /all groups/i.test(c.title)
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = arg("url") ?? DEFAULT_URL;
  const dryRun = hasFlag("dry-run");
  const verify = hasFlag("verify");

  console.log(`Fetching CPI from ${url} ...`);
  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) {
    console.error(`Download failed: HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const text = await res.text();

  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const rows = parsed.data as string[][];
  if (!rows.length) {
    console.error("CSV parsed to zero rows — unexpected format.");
    process.exit(1);
  }

  const { columns, dataStart } = analyse(rows);
  const column = pickColumn(columns);

  if (!column) {
    console.error(
      "Could not identify the All Groups CPI index column. Available columns:"
    );
    for (const c of columns) {
      console.error(
        `  col ${c.index}: [${c.seriesId}] units="${c.units}" title="${c.title}"`
      );
    }
    console.error(
      "Re-run with --series=<ID> or --col=<n> once you've identified the right one."
    );
    process.exit(1);
  }

  console.log(
    `Using column ${column.index}: [${column.seriesId}] "${column.title}" (${column.units})`
  );

  // Build one observation per quarter (latest row wins for a given quarter).
  const byQuarter = new Map<
    string,
    { quarterEnd: Date; label: string; value: number }
  >();

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    const date = parseDate(row?.[0] ?? "");
    if (!date) continue;
    const raw = (row[column.index] ?? "").trim().replace(/,/g, "");
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
    console.error("No CPI observations parsed — check the column/date format.");
    process.exit(1);
  }

  const first = observations[0];
  const last = observations[observations.length - 1];
  console.log(
    `Parsed ${observations.length} quarterly CPI values: ` +
      `${first.label} (${first.value}) → ${last.label} (${last.value})`
  );

  if (dryRun) {
    console.log("Dry run — no database writes.");
  } else {
    const { db } = await import("../lib/db");
    let written = 0;
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
      written++;
    }
    console.log(`Upserted ${written} CPI quarters into CpiIndex.`);
  }

  if (verify) {
    const map = new Map(observations.map((o) => [o.label, o.value]));
    const factor = (acq: string, evt: string) => {
      const a = map.get(acq);
      const e = map.get(evt);
      if (a == null || e == null) return "n/a";
      return (Math.round((e / a) * 1000) / 1000).toFixed(3);
    };
    console.log("\nSample indexation factors (frozen at 1999-Q3):");
    for (const acq of ["1985-Q3", "1990-Q3", "1995-Q1", "1999-Q2"]) {
      console.log(`  ${acq} → 1999-Q3 : ${factor(acq, "1999-Q3")}`);
    }
    console.log(`\nLatest real-return reference: ${last.label} = ${last.value}`);
  }

  if (!dryRun) {
    const { db } = await import("../lib/db");
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
