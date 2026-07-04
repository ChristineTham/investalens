import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { searchInstruments } from "@/lib/providers/instrument-search";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const market = searchParams.get("market") || undefined;

  if (!query)
    return jsonError("bad_request", "Query parameter 'q' is required", 400);

  const results = await searchInstruments(query, market);
  return jsonSuccess(results);
}
