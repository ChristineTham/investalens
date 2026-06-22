/**
 * FIIG Securities bond rate sheet provider.
 *
 * The public FIIG rate sheet (https://fiig.com.au/fiig/bond-rates) is rendered
 * from a JSON API at `bondtickerapi.fiig.com.au`. Each record is keyed by ISIN,
 * which matches the `code` we store for imported FIIG bond instruments, so we
 * can match held bonds to live capital prices exactly.
 */

const FIIG_BONDS_API =
  "https://bondtickerapi.fiig.com.au/api/instruments/bonds";

export interface FiigBondRate {
  /** ISIN — matches our bond instrument `code`. */
  isin: string;
  companyName: string;
  securityDescription: string;
  /** Clean capital price as a percentage of par (e.g. 98.714 = 98.714%). */
  price: number;
  /** Yield as a decimal fraction (e.g. 0.055 = 5.5%). */
  yield: number;
  maturityDate: string | null;
  /** Coupon rate as a decimal fraction (e.g. 0.045 = 4.5%). */
  couponDetail: number | null;
  couponFrequency: string | null;
  sector: string | null;
}

interface FiigApiBond {
  isin: string;
  companyName: string;
  securityDescription: string;
  price: number;
  yield: number;
  maturityDate: string | null;
  couponDetail: string | null;
  couponFrequency: string | null;
  sector: string | null;
}

interface FiigApiResponse {
  data: FiigApiBond[];
  stats?: { totals?: { count?: number } };
}

/**
 * Fetch the full FIIG bond rate sheet. Returns a map keyed by uppercased ISIN.
 *
 * The API is fronted by a WAF that rejects requests without browser-like
 * headers, so we send a realistic User-Agent / Origin / Referer.
 */
export async function fetchFiigBondRates(): Promise<Map<string, FiigBondRate>> {
  const url = `${FIIG_BONDS_API}?pageNo=1&pageSize=2000&sortField=companyName&sortDescending=false`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36",
      Origin: "https://fiig.com.au",
      Referer: "https://fiig.com.au/",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`FIIG rate sheet request failed (HTTP ${res.status})`);
  }

  const json = (await res.json()) as FiigApiResponse;
  const map = new Map<string, FiigBondRate>();

  for (const b of json.data ?? []) {
    if (!b.isin || typeof b.price !== "number") continue;
    map.set(b.isin.toUpperCase(), {
      isin: b.isin,
      companyName: b.companyName,
      securityDescription: b.securityDescription,
      price: b.price,
      yield: b.yield,
      maturityDate: b.maturityDate,
      couponDetail: b.couponDetail != null ? Number(b.couponDetail) : null,
      couponFrequency: b.couponFrequency,
      sector: b.sector,
    });
  }

  return map;
}
