"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X, Plus, Loader2, RotateCcw, Merge } from "lucide-react";
import { createCategory,
  updateCategory,
  deleteCategory,
  mergeCategories,
  resetCategoriesToDefault,
} from "@/lib/actions/accounts";
import { CATEGORY_KINDS } from "@/lib/validators/account";
import { roselySwatchClass } from "@/lib/constants/chart-colors";

export interface CategoryRow {
  id: string;
  name: string;
  kind: string;
  color: string | null;
  isSystem: boolean;
  usage: number;
}

/** Selectable palette (CSS custom properties resolved at render time). */
const COLOR_SWATCHES = [
  "var(--rosely1)",
  "var(--rosely2)",
  "var(--rosely3)",
  "var(--rosely4)",
  "var(--rosely5)",
  "var(--rosely6)",
  "var(--rosely7)",
  "var(--rosely8)",
  "var(--rosely11)",
  "var(--rosely12)",
  "var(--rosely13)",
  "var(--rosely14)",
];

const inputCls =
  "h-8 rounded-md border border-input bg-background px-2 text-sm";

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Use colour ${c}`}
          className={`h-5 w-5 rounded-full border transition ${roselySwatchClass(c)} ${
            value === c
              ? "border-foreground ring-2 ring-ring ring-offset-1 ring-offset-background"
              : "border-border"
          }`}
        />
      ))}
    </div>
  );
}

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full border border-border align-middle ${
        color ? roselySwatchClass(color) : ""
      }`}
      aria-hidden
    />
  );
}

function AddCategoryRow() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("expense");
  const [color, setColor] = useState<string>(COLOR_SWATCHES[6]);
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createCategory({ name: name.trim(), kind, color });
      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="border-b-2 border-border bg-muted/30">
      <td className="px-3 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="New category…"
          aria-label="New category name"
          className={`${inputCls} w-full`}
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="New category kind"
          className={`${inputCls} w-full capitalize`}
        >
          {CATEGORY_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <ColorPicker value={color} onChange={setColor} />
      </td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2 text-right">
        <button
          onClick={handleAdd}
          disabled={loading || !name.trim()}
          aria-label="Add category"
          title="Add category"
          className="rounded-md bg-primary p-1 text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </td>
    </tr>
  );
}

function CategoryItem({ c, others }: { c: CategoryRow; others: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(c.name);
  const [kind, setKind] = useState(c.kind);
  const [color, setColor] = useState<string>(c.color ?? COLOR_SWATCHES[6]);

  // Inline delete (with reassignment) / merge panel.
  const [mode, setMode] = useState<null | "delete" | "merge">(null);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setName(c.name);
    setKind(c.kind);
    setColor(c.color ?? COLOR_SWATCHES[6]);
    setEditing(true);
  }

  function openPanel(m: "delete" | "merge") {
    setTarget("");
    setMode(m);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateCategory(c.id, { name: name.trim(), kind, color });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    setBusy(true);
    try {
      await deleteCategory(c.id, target || null);
      setMode(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleMergeConfirm() {
    if (!target) return;
    setBusy(true);
    try {
      await mergeCategories(c.id, target);
      setMode(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <tr className="bg-accent/30">
        <td className="px-3 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Category name"
            className={`${inputCls} w-full`}
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Category kind"
            className={`${inputCls} w-full capitalize`}
          >
            {CATEGORY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <ColorPicker value={color} onChange={setColor} />
        </td>
        <td className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
          {c.usage}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              aria-label="Save category"
              title="Save"
              className="rounded-md p-1 text-green-700 hover:bg-green-600/10 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              aria-label="Cancel editing"
              title="Cancel"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="hover:bg-accent/50">
        <td className="px-3 py-2.5 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Swatch color={c.color} />
            {c.name}
            {c.isSystem && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Default
              </span>
            )}
          </span>
        </td>
        <td className="px-3 py-2.5 text-sm capitalize text-muted-foreground">{c.kind}</td>
        <td className="px-3 py-2.5">
          <Swatch color={c.color} />
        </td>
        <td className="px-3 py-2.5 text-right text-sm text-muted-foreground tabular-nums">
          {c.usage}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={startEdit}
              aria-label="Edit category"
              title="Edit"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openPanel("merge")}
              disabled={others.length === 0}
              aria-label="Merge category"
              title="Merge into another category"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Merge className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openPanel("delete")}
              aria-label="Delete category"
              title="Delete"
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {mode === "delete" && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-3 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {c.usage > 0 ? (
                <>
                  <span>
                    Move {c.usage} transaction{c.usage === 1 ? "" : "s"} to
                  </span>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    aria-label="Reassign transactions to"
                    className={inputCls}
                  >
                    <option value="">Uncategorised</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <span>
                    then delete <strong>{c.name}</strong>.
                  </span>
                </>
              ) : (
                <span>
                  Delete <strong>{c.name}</strong>?
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Delete
                </button>
                <button
                  onClick={() => setMode(null)}
                  disabled={busy}
                  className="rounded-md border border-input px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {mode === "merge" && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-3 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                Merge <strong>{c.name}</strong>
                {c.usage > 0 ? ` (${c.usage} transaction${c.usage === 1 ? "" : "s"})` : ""} into
              </span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-label="Merge into category"
                className={inputCls}
              >
                <option value="">Select category…</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex gap-1">
                <button
                  onClick={handleMergeConfirm}
                  disabled={busy || !target}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Merge
                </button>
                <button
                  onClick={() => setMode(null)}
                  disabled={busy}
                  className="rounded-md border border-input px-2.5 py-1 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (
      !confirm(
        "Reset all categories to the defaults?\n\nYour custom categories will be removed and any transactions using them will become uncategorised."
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await resetCategoriesToDefault();
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {resetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reset to defaults
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-150">
          <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left">Name</th>
              <th className="px-3 py-2.5 text-left">Kind</th>
              <th className="px-3 py-2.5 text-left">Colour</th>
              <th className="px-3 py-2.5 text-right">Used</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AddCategoryRow />
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  No categories yet — add one above or reset to defaults.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <CategoryItem
                  key={c.id}
                  c={c}
                  others={categories.filter((o) => o.id !== c.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
