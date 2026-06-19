import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Check if AI is available
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Import unavailable — GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    // @ts-expect-error — optional dependency, installed when AI features are enabled
    const { generateObject } = await import("ai");
    // @ts-expect-error — optional dependency, installed when AI features are enabled
    const { google } = await import("@ai-sdk/google");
    const { z } = await import("zod");

    const { content, documentType } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const TransactionSchema = z.object({
      tradeDate: z.string().describe("ISO 8601 date"),
      instrumentCode: z.string().describe("Ticker symbol"),
      marketCode: z.string().describe("Exchange code, e.g. ASX, NYSE"),
      transactionType: z.enum(["BUY", "SELL", "DIVIDEND", "INTEREST", "COUPON", "FEE", "DRP"]),
      quantity: z.number(),
      price: z.number().describe("Price per unit"),
      brokerage: z.number().default(0),
      currency: z.string().default("AUD"),
      comments: z.string().optional(),
    });

    const ImportResultSchema = z.object({
      transactions: z.array(TransactionSchema),
      warnings: z.array(z.string()),
    });

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: ImportResultSchema,
      prompt: `You are a financial document parser for Australian investors.
Document type: ${documentType || "Unknown"}
Extract all transactions from this content. Use ASX as default market for Australian stocks.
Dates should be ISO 8601 format (YYYY-MM-DD).

Content:
${content.slice(0, 10000)}`,
    });

    return NextResponse.json(object);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI parsing failed" },
      { status: 500 }
    );
  }
}
