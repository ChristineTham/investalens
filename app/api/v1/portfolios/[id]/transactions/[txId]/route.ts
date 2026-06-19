import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id, txId } = await params;

  const transaction = await db.transaction.findFirst({
    where: {
      id: txId,
      holding: { portfolioId: id, portfolio: { userId: auth.userId } },
    },
    include: { holding: { include: { instrument: true } } },
  });

  if (!transaction)
    return jsonError("not_found", "Transaction not found", 404);
  return jsonSuccess(transaction);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "write"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id, txId } = await params;
  const body = await request.json();

  const transaction = await db.transaction.findFirst({
    where: {
      id: txId,
      holding: { portfolioId: id, portfolio: { userId: auth.userId } },
    },
  });

  if (!transaction)
    return jsonError("not_found", "Transaction not found", 404);

  const updated = await db.transaction.update({
    where: { id: txId },
    data: {
      ...(body.transactionType && { transactionType: body.transactionType }),
      ...(body.tradeDate && { tradeDate: new Date(body.tradeDate) }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.brokerage !== undefined && { brokerage: body.brokerage }),
      ...(body.currency && { currency: body.currency }),
      ...(body.exchangeRate !== undefined && {
        exchangeRate: body.exchangeRate,
      }),
      ...(body.comments !== undefined && { comments: body.comments }),
    },
  });

  return jsonSuccess(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "admin"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id, txId } = await params;

  const transaction = await db.transaction.findFirst({
    where: {
      id: txId,
      holding: { portfolioId: id, portfolio: { userId: auth.userId } },
    },
  });

  if (!transaction)
    return jsonError("not_found", "Transaction not found", 404);

  await db.transaction.delete({ where: { id: txId } });
  return jsonSuccess({ deleted: true });
}
