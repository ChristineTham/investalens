import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { yahooFinance } from "@/lib/providers/yahoo-finance";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market") || "ASX";

  try {
    const quote = await yahooFinance.getQuote(code, market);
    if (!quote) return jsonError("not_found", "Quote not found", 404);
    return jsonSuccess(quote);
  } catch (error) {
    return jsonError(
      "provider_error",
      error instanceof Error ? error.message : "Failed to fetch quote",
      502
    );
  }
}
