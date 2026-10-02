import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SYSTEM_PROMPT =
  "You are J.A.R.V.I.S., Tony Stark's brilliant, highly advanced AI butler. You are articulate, dryly witty, and exceptionally sophisticated. Keep your answers crisp, intelligent, and brief (under 3-4 sentences), maintaining an elegant, high-class British manner. Proactively address the user as 'Sir' or 'Ma'am'.";

const Body = z.object({
  model: z.enum(["gpt-4o-mini", "gpt-4o"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(20),
});

/** Streams plain text tokens from OpenAI Chat Completions. */
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["OPENAI_API_KEY"];
        if (!apiKey) return new Response("OpenAI key is not configured", { status: 500 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });

        const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: parsed.data.model,
            stream: true,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...parsed.data.messages],
          }),
          signal: request.signal,
        });
        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text();
          console.error(`OpenAI failed [${upstream.status}]: ${err}`);
          return new Response(`OpenAI request failed [${upstream.status}]: ${err}`, { status: upstream.status || 502 });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        const stream = upstream.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              buffer += decoder.decode(chunk, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const data = line.trim().replace(/^data:\s*/, "");
                if (!data || data === "[DONE]" || !line.trim().startsWith("data:")) continue;
                try {
                  const token = JSON.parse(data).choices?.[0]?.delta?.content;
                  if (token) controller.enqueue(encoder.encode(token));
                } catch { /* partial line */ }
              }
            },
          }),
        );
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      },
    },
  },
});
