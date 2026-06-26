"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listModelsForPicker,
  setDashboardModel,
} from "@/lib/actions/model";

export function DashboardModelPicker({ currentId }: { currentId: string }) {
  const router = useRouter();
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listModelsForPicker()
      .then(setModels)
      .catch(() => {});
  }, []);

  function onChange(id: string) {
    startTransition(async () => {
      try {
        await setDashboardModel(id);
        router.refresh();
      } catch {
        /* ignore */
      }
    });
  }

  if (models.length === 0) return null;

  return (
    <select
      aria-label="Dashboard comparison model"
      className="h-7 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50"
      value={currentId}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
    >
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
