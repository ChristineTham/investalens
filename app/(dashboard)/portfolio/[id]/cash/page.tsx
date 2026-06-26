import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureVirtualAccount } from "@/lib/services/accounts";
import { syncPortfolioLedger } from "@/lib/services/cash-ledger";

/**
 * Resolves a portfolio's "Cash" view: a linked physical settlement account if one
 * exists (default first), otherwise the portfolio's virtual cash ledger (created
 * and synced on demand). Redirects to the resolved account's detail page.
 */
export default async function CashPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/accounts");

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!portfolio) redirect("/accounts");

  // Prefer a linked physical account (default first).
  const link = await db.portfolioAccount.findFirst({
    where: { portfolioId: id },
    orderBy: { isDefault: "desc" },
    select: { cashAccountId: true },
  });
  if (link) redirect(`/accounts/${link.cashAccountId}`);

  // Otherwise fall back to the virtual ledger, rebuilt so it reflects current data.
  const virtual = await ensureVirtualAccount(id);
  await syncPortfolioLedger(id);
  redirect(`/accounts/${virtual.id}`);
}

