export default function ModelsLoading() {
  return (
    <div role="status" className="flex flex-1 items-center justify-center p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
