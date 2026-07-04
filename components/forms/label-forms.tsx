"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLabel, deleteLabel } from "@/lib/actions/labels";
import { Plus, Trash2 } from "lucide-react";

export function CreateLabelForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createLabel(name.trim());
      setName("");
      setLoading(false);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New label name..."
        aria-label="Label name"
        className="flex h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Label
      </button>
    </form>
  );
}

export function DeleteLabelButton({ labelId }: { labelId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this label?")) return;
    setLoading(true);
    try {
      await deleteLabel(labelId);
      setLoading(false);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      title="Delete label"
      aria-label="Delete label"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
