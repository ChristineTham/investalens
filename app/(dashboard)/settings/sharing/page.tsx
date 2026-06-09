import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function SharingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const shares = await db.portfolioShare.findMany({
    where: { portfolio: { userId: session.user.id } },
    include: { portfolio: { select: { name: true } } },
  });

  const sharedWithMe = await db.portfolioShare.findMany({
    where: { email: session.user.email! },
    include: {
      portfolio: {
        select: { name: true },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Portfolio Sharing</h1>
      <p className="text-sm text-muted-foreground">
        Share portfolios with other users and manage access levels.
      </p>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Shared by you</h2>
        {shares.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You haven&apos;t shared any portfolios.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {shares.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{s.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.portfolio.name}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">
                  {s.accessLevel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Shared with you</h2>
        {sharedWithMe.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No portfolios shared with you.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {sharedWithMe.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{s.portfolio.name}</p>
                  <p className="text-xs text-muted-foreground">
                    From: {s.portfolio.user.email}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">
                  {s.accessLevel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
