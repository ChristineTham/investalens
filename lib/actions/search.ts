"use server";

import { auth } from "@/lib/auth";
import { searchInstruments as clientSearch } from "@/lib/providers/instrument-search";

export async function searchInstrumentsAction(
  query: string,
  market?: string
) {
  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Perform the search
  return await clientSearch(query, market);
}
