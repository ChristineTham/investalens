import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  AddToWatchlistForm,
  RemoveFromWatchlistButton,
} from "@/components/forms/watchlist-forms";

export default async function WatchlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const watchlist = await db.watchlist.findFirst({
    where: { userId: session.user.id },
    include: { items: true },
  });

  const items = watchlist?.items || [];

  // Fetch instrument details for watchlist items
  const instrumentIds = items.map((i) => i.instrumentId);
  const instruments = instrumentIds.length > 0
    ? await db.instrument.findMany({ where: { id: { in: instrumentIds } } })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Track instruments you&apos;re interested in with price alerts.
        </p>
      </div>

      <AddToWatchlistForm />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12">
          <h3 className="text-lg font-medium">Watchlist is empty</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the search above to add instruments.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Market
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Notes
                </th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const inst = instruments.find((i) => i.id === item.instrumentId);
                return (
                  <tr key={item.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">
                      {inst?.code || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inst?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inst?.marketCode || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {item.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RemoveFromWatchlistButton itemId={item.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
