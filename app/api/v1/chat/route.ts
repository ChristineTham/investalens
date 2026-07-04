import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  authenticateApiRequest,
  hasScope,
  jsonError,
} from "@/lib/api/middleware";

const MAX_MESSAGES = 50;
const MAX_TOTAL_CONTENT_CHARS = 8000;

export async function POST(req: Request) {
  // Accept either a v1 API token (read scope) or an in-app NextAuth session.
  const token = await authenticateApiRequest(req);
  if (token instanceof Response) return token;
  if (!token || !hasScope(token.scope, "read")) {
    const session = await auth();
    if (!session?.user?.id)
      return jsonError("unauthorized", "Authentication required", 401);
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Chat unavailable — GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const { streamText } = await import("ai");
    const { google } = await import("@ai-sdk/google");

    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
      return jsonError(
        "bad_request",
        `messages must be an array of at most ${MAX_MESSAGES} messages`,
        400
      );
    }

    const totalChars = messages.reduce(
      (sum: number, m: { content?: unknown }) =>
        sum +
        (typeof m?.content === "string"
          ? m.content.length
          : JSON.stringify(m?.content ?? "").length),
      0
    );
    if (totalChars > MAX_TOTAL_CONTENT_CHARS) {
      return jsonError(
        "bad_request",
        `Total message content must not exceed ${MAX_TOTAL_CONTENT_CHARS} characters`,
        400
      );
    }

    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: `You are a helpful portfolio analysis assistant for InvestaLens, an Australian investment portfolio tracker.
You help users understand their portfolio performance, risk metrics, and investment strategies.
Be concise, use Australian financial terminology (e.g. franking credits, super, ASX).
When discussing numbers, use AUD by default.`,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
