import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { db } from "../lib/db";

const BENCHMARKS = [
  { code: "^AXJO", marketCode: "ASX", name: "S&P/ASX 200", instrumentType: "INDEX", currency: "AUD", country: "AU" },
  { code: "IOZ.AX", marketCode: "ASX", name: "iShares Core S&P/ASX 200 ETF", instrumentType: "ETF", currency: "AUD", country: "AU" },
  { code: "^GSPC", marketCode: "NYSE", name: "S&P 500", instrumentType: "INDEX", currency: "USD", country: "US" },
  { code: "URTH", marketCode: "NYSE", name: "MSCI World ETF", instrumentType: "ETF", currency: "USD", country: "US" },
  { code: "STW.AX", marketCode: "ASX", name: "SPDR S&P/ASX 200 Fund", instrumentType: "ETF", currency: "AUD", country: "AU" },
  { code: "SPY", marketCode: "NYSE", name: "SPDR S&P 500 ETF Trust", instrumentType: "ETF", currency: "USD", country: "US" },
];

async function main() {
  console.log("Seeding benchmark instruments...");

  for (const benchmark of BENCHMARKS) {
    const result = await db.instrument.upsert({
      where: {
        code_marketCode: { code: benchmark.code, marketCode: benchmark.marketCode },
      },
      update: { name: benchmark.name, instrumentType: benchmark.instrumentType },
      create: benchmark,
    });
    console.log(`  ✓ ${result.code} (${result.name})`);
  }

  console.log(`\nDone — ${BENCHMARKS.length} benchmark instruments seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
