"use server";

import { requireUser } from "@/lib/auth";
import { searchInstruments as clientSearch } from "@/lib/providers/instrument-search";

export async function searchInstrumentsAction(query: string, market?: string) {
  // Verify user is authenticated
  await requireUser();

  // Perform the search
  return await clientSearch(query, market);
}
