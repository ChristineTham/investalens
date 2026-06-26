import Link from "next/link";

export default function ModelNotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <h2 className="font-serif text-xl font-bold text-foreground">
        Model Not Found
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This model portfolio doesn&apos;t exist or you don&apos;t have access to
        it.
      </p>
      <Link
        href="/models"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Back to Models
      </Link>
    </div>
  );
}
