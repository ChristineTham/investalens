import Link from "next/link";
import { auth } from "@/lib/auth";

const primaryBtn =
  "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Auth-aware links for the public marketing/help/privacy navs. Shows a
 * "Dashboard" button when signed in, otherwise "Sign In" (and optionally a
 * "Get Started" call to action).
 */
export async function PublicNavAuth({
  showGetStarted = false,
}: {
  showGetStarted?: boolean;
}) {
  const session = await auth();

  if (session?.user) {
    return (
      <Link href="/dashboard" className={primaryBtn}>
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Sign In
      </Link>
      {showGetStarted && (
        <Link href="/register" className={primaryBtn}>
          Get Started
        </Link>
      )}
    </>
  );
}
