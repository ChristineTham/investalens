import { redirect } from "next/navigation";

/**
 * Cash accounts are now first-class, user-scoped accounts under /accounts.
 * This legacy per-portfolio route redirects there.
 */
export default async function CashPage() {
  redirect("/accounts");
}
