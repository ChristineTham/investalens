"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { duplicateModel } from "@/lib/actions/model";

export function DuplicateModelButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const copy = await duplicateModel(id);
      router.push(`/models/${copy.id}/edit`);
      router.refresh();
    } catch {
      setBusy(false);
      alert("Failed to duplicate model");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      <Copy className="h-4 w-4" />
      {busy ? "Duplicating..." : "Duplicate to edit"}
    </button>
  );
}
