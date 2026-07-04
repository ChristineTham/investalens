"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignInstrument, removeAssignment } from "@/lib/actions/groups";

export interface GroupInstrument {
  id: string;
  code: string;
  name: string;
}

interface GroupInstrumentAssignmentsProps {
  categories: { id: string; name: string }[];
  instruments: GroupInstrument[];
  /** instrumentId -> categoryId for this group's current assignments. */
  assignments: Record<string, string>;
}

/**
 * Per-instrument category selector for a custom group. Lists every instrument
 * held by the user (unassigned ones show "Unassigned") and moves it between
 * categories via the existing assign/remove actions.
 */
export function GroupInstrumentAssignments({
  categories,
  instruments,
  assignments,
}: GroupInstrumentAssignmentsProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<Record<string, string>>(assignments);
  const [pending, setPending] = useState<string | null>(null);

  async function handleChange(instrumentId: string, categoryId: string) {
    const previous = current[instrumentId];
    setPending(instrumentId);
    try {
      if (previous) await removeAssignment(previous, instrumentId);
      if (categoryId) await assignInstrument(categoryId, instrumentId);
      setCurrent((c) => {
        const next = { ...c };
        if (categoryId) {
          next[instrumentId] = categoryId;
        } else {
          delete next[instrumentId];
        }
        return next;
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (instruments.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        You have no instruments to assign yet.
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Add a category to start assigning instruments.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Instrument
            </th>
            <th className="w-56 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Category
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {instruments.map((inst) => (
            <tr key={inst.id} className="hover:bg-accent/50">
              <td className="px-3 py-2 text-sm">
                <span className="font-medium">{inst.code}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {inst.name}
                </span>
              </td>
              <td className="px-3 py-2">
                <select
                  value={current[inst.id] || ""}
                  disabled={pending === inst.id}
                  onChange={(e) => handleChange(inst.id, e.target.value)}
                  aria-label={`Category for ${inst.code}`}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
