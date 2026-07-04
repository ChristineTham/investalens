"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignLabel, removeLabel } from "@/lib/actions/labels";
import { Tags } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface AssignableHolding {
  id: string;
  code: string;
  name: string;
  portfolioName: string;
}

interface ManageLabelHoldingsProps {
  label: { id: string; name: string };
  holdings: AssignableHolding[];
  assignedIds: string[];
}

/**
 * Dialog listing every holding across the user's portfolios with a checkbox
 * to attach / detach the label. Changes apply immediately.
 */
export function ManageLabelHoldings({
  label,
  holdings,
  assignedIds,
}: ManageLabelHoldingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState<Set<string>>(new Set(assignedIds));
  const [pending, setPending] = useState<string | null>(null);

  async function handleToggle(holdingId: string, checked: boolean) {
    setPending(holdingId);
    try {
      if (checked) {
        await assignLabel(holdingId, label.id);
        setAssigned((s) => new Set(s).add(holdingId));
      } else {
        await removeLabel(holdingId, label.id);
        setAssigned((s) => {
          const next = new Set(s);
          next.delete(holdingId);
          return next;
        });
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs font-medium hover:bg-accent"
      >
        <Tags className="h-3.5 w-3.5" />
        Manage holdings
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Holdings for &ldquo;{label.name}&rdquo;</DialogTitle>
            <DialogDescription>
              Tick a holding to attach this label; untick to detach.
            </DialogDescription>
          </DialogHeader>
          {holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no holdings yet.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {holdings.map((h) => (
                <li key={h.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={assigned.has(h.id)}
                      disabled={pending === h.id}
                      onChange={(e) => handleToggle(h.id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <span className="font-medium">{h.code}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {h.name}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {h.portfolioName}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
