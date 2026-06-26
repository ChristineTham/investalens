"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Loader2 } from "lucide-react";
import { convertVirtualAccount } from "@/lib/actions/accounts";

/** Promotes a portfolio's virtual cash ledger into a real, editable account. */
export function ConvertVirtualButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
    if (
      !confirm(
        "Convert this virtual ledger into a real, editable account?\n\n" +
          "Its auto-posted transactions become editable manual entries and the " +
          "account is linked to the portfolio as its settlement account. This " +
          "cannot be undone automatically."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await convertVirtualAccount(accountId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConvert}
      disabled={loading}
      className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wallet className="h-3.5 w-3.5" />
      )}
      Convert to real account
    </button>
  );
}
