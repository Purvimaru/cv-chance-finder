import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export class AiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function structured<T>(schema: z.ZodType<T>, instructions: string, prompt: string): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured.", 500);
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions,
    messages: [{ role: "user", content: prompt }],
    output: Output.object({ schema }),
    maxRetries: 0,
    onError: ({ error }: { error: unknown }) => { streamError = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  } as any);
  try {
    return (await result.output) as T;
  } catch (e) {
    const err: any = streamError ?? e;
    const status = err?.statusCode ?? err?.status;
    console.error("AI call failed", status, err?.responseBody ?? err?.message);
    if (status === 402) throw new AiError("AI credits have run out. Please add credits to keep matching.", 402);
    if (status === 429) throw new AiError("Too many requests right now. Please wait a minute and try again.", 429);
    if (status === 403) throw new AiError("AI access is blocked for this workspace.", 403);
    if (NoObjectGeneratedError.isInstance(e)) throw new AiError("The AI returned an unreadable answer. Try again.", 500);
    throw new AiError("The AI could not finish. Please try again.", 500);
  }
}
