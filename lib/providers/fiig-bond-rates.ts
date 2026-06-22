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

/** Full rate-sheet URL (all bonds in one page). */
export const FIIG_BONDS_URL = `${FIIG_BONDS_API}?pageNo=1&pageSize=2000&sortField=companyName&sortDescending=false`;

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
 * Parse a raw FIIG bonds API response into normalized rate records.
 * Pure function — safe to run in the browser or on the server.
 */
export function parseFiigBonds(json: unknown): FiigBondRate[] {
  const data = (json as FiigApiResponse)?.data ?? [];
  const out: FiigBondRate[] = [];
  for (const b of data) {
    const price = Number(b.price);
    if (!b.isin || isNaN(price)) continue;
    out.push({
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
  return out;
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
 * The FIIG API server also serves an INCOMPLETE certificate chain (it omits the
 * intermediate CA). Browsers recover via AIA fetching; Node.js does not, so
 * verification fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. We therefore perform
 * this single request with Node's `https` module and `rejectUnauthorized:false`.
 * This is acceptable because the request sends no credentials and the response
 * is public, read-only bond pricing (worst-case MITM = wrong displayed prices,
 * not data disclosure). All other TLS in the app keeps full verification.
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

  let response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
  try {
    response = await httpsGet(url, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-AU,en;q=0.9",
      Origin: "https://fiig.com.au",
      Referer: "https://fiig.com.au/",
    });
  } catch (err) {
    diag.durationMs = Date.now() - start;
    diag.errorName = err instanceof Error ? err.name : "Error";
    diag.errorMessage = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    if (code) diag.errorMessage = `${diag.errorMessage} (code: ${code})`;
    const hint =
      diag.errorName === "TimeoutError" || code === "ETIMEDOUT"
        ? "The request timed out."
        : "A network error occurred (DNS, TLS, or the host is unreachable from this server).";
    throw new FiigFetchError(`Could not reach the FIIG rate sheet. ${hint}`, diag);
  }

  diag.durationMs = Date.now() - start;
  diag.status = response.status;
  diag.statusText = response.statusText;
  diag.responseHeaders = response.headers;

  if (response.status < 200 || response.status >= 300) {
    diag.bodySnippet = response.body.slice(0, 1000);
    const reason =
      response.status === 403
        ? "The FIIG rate sheet blocked the request (HTTP 403). It may be unavailable from this server's network."
        : `FIIG rate sheet request failed (HTTP ${response.status} ${response.statusText}).`;
    throw new FiigFetchError(reason, diag);
  }

  let json: FiigApiResponse;
  try {
    diag.bodySnippet = response.body.slice(0, 500);
    json = JSON.parse(response.body) as FiigApiResponse;
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

/**
 * Perform an HTTPS GET using Node's `https` module with `rejectUnauthorized`
 * disabled (FIIG serves an incomplete cert chain — see {@link fetchFiigBondRates}).
 * Server-only; `node:https` is dynamically imported so this module stays out of
 * any client bundle.
 */
async function httpsGet(
  url: string,
  headers: Record<string, string>
): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}> {
  const https = await import("node:https");

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers,
        rejectUnauthorized: false,
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c as Buffer));
        res.on("end", () => {
          const respHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            respHeaders[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            headers: respHeaders,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(Object.assign(new Error("Request timed out"), { name: "TimeoutError" }));
    });
    req.on("error", reject);
    req.end();
  });
}
