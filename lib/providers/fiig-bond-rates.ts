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

/** Structured diagnostics captured during a rate-sheet fetch attempt. */
export interface FiigFetchDiagnostics {
  url: string;
  startedAt: string;
  durationMs: number;
  ok: boolean;
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string>;
  bodySnippet?: string;
  recordCount?: number;
  errorName?: string;
  errorMessage?: string;
}

/** Error carrying full diagnostics for display/copy in the UI. */
export class FiigFetchError extends Error {
  diagnostics: FiigFetchDiagnostics;
  constructor(message: string, diagnostics: FiigFetchDiagnostics) {
    super(message);
    this.name = "FiigFetchError";
    this.diagnostics = diagnostics;
  }
}

/**
 * Fetch the full FIIG bond rate sheet. Returns a map keyed by uppercased ISIN.
 *
 * The API is fronted by a WAF that rejects requests without browser-like
 * headers, so we send a realistic User-Agent / Origin / Referer.
 *
 * On failure, throws a {@link FiigFetchError} carrying full diagnostics so the
 * UI can present a copyable error log.
 */
export async function fetchFiigBondRates(): Promise<Map<string, FiigBondRate>> {
  const url = `${FIIG_BONDS_API}?pageNo=1&pageSize=2000&sortField=companyName&sortDescending=false`;

  const startedAt = new Date();
  const start = Date.now();
  const diag: FiigFetchDiagnostics = {
    url,
    startedAt: startedAt.toISOString(),
    durationMs: 0,
    ok: false,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-AU,en;q=0.9",
        Origin: "https://fiig.com.au",
        Referer: "https://fiig.com.au/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    diag.durationMs = Date.now() - start;
    diag.errorName = err instanceof Error ? err.name : "Error";
    diag.errorMessage = err instanceof Error ? err.message : String(err);
    const hint =
      diag.errorName === "TimeoutError"
        ? "The request timed out after 30s."
        : "A network error occurred (DNS, TLS, or the host is unreachable from this server).";
    throw new FiigFetchError(`Could not reach the FIIG rate sheet. ${hint}`, diag);
  }

  diag.durationMs = Date.now() - start;
  diag.status = res.status;
  diag.statusText = res.statusText;
  diag.responseHeaders = Object.fromEntries(res.headers.entries());

  if (!res.ok) {
    // Capture a snippet of the body to help diagnose WAF/error pages
    try {
      const text = await res.text();
      diag.bodySnippet = text.slice(0, 1000);
    } catch {
      /* ignore */
    }
    const reason =
      res.status === 403
        ? "The FIIG rate sheet blocked the request (HTTP 403). It may be unavailable from this server's network."
        : `FIIG rate sheet request failed (HTTP ${res.status} ${res.statusText}).`;
    throw new FiigFetchError(reason, diag);
  }

  let json: FiigApiResponse;
  try {
    const text = await res.text();
    diag.bodySnippet = text.slice(0, 500);
    json = JSON.parse(text) as FiigApiResponse;
  } catch (err) {
    diag.errorName = err instanceof Error ? err.name : "Error";
    diag.errorMessage = err instanceof Error ? err.message : String(err);
    throw new FiigFetchError(
      "FIIG rate sheet returned an unexpected (non-JSON) response.",
      diag
    );
  }

  const map = new Map<string, FiigBondRate>();

  for (const b of json.data ?? []) {
    const price = Number(b.price);
    if (!b.isin || isNaN(price)) continue;
    map.set(b.isin.toUpperCase(), {
      isin: b.isin,
      companyName: b.companyName,
      securityDescription: b.securityDescription,
      price,
      yield: Number(b.yield),
      maturityDate: b.maturityDate,
      couponDetail: b.couponDetail != null ? Number(b.couponDetail) : null,
      couponFrequency: b.couponFrequency,
      sector: b.sector,
    });
  }

  diag.ok = true;
  diag.recordCount = map.size;

  return map;
}
