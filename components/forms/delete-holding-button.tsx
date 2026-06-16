"use client";

import { useState } from "react";
import { deleteHolding } from "@/lib/actions/holding";
import { Trash2 } from "lucide-react";

interface DeleteHoldingButtonProps {
  holdingId: string;
  portfolioId: string;
  instrumentCode: string;
}

export function DeleteHoldingButton({
  holdingId,
  portfolioId,
  instrumentCode,
}: DeleteHoldingButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete holding "${instrumentCode}" and all its transactions? This cannot be undone.`
      )
    )
      return;

    setDeleting(true);
    try {
      await deleteHolding(holdingId);
      window.location.href = `/portfolio/${portfolioId}`;
    } catch {
      setDeleting(false);
      alert("Failed to delete holding");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {deleting ? "Deleting..." : "Delete Holding"}
    </button>
  );
}
