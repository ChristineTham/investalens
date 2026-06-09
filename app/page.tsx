import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/portfolio");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="font-serif text-4xl font-bold text-foreground">
          InvestaLens
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Track, analyse and optimise your investment portfolio. Import from any
          broker, get performance reports, tax calculations, and advanced analytics.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-input px-6 py-3 text-sm font-medium hover:bg-accent"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
