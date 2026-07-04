export default function Loading() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
