import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Chat unavailable — GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    // @ts-expect-error — optional dependency, installed when AI features are enabled
    const { streamText } = await import("ai");
    // @ts-expect-error — optional dependency, installed when AI features are enabled
    const { google } = await import("@ai-sdk/google");

    const { messages } = await req.json();

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: `You are a helpful portfolio analysis assistant for InvestaLens, an Australian investment portfolio tracker.
You help users understand their portfolio performance, risk metrics, and investment strategies.
Be concise, use Australian financial terminology (e.g. franking credits, super, ASX).
When discussing numbers, use AUD by default.`,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
