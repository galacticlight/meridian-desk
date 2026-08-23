import { createServerFn } from "@tanstack/react-start";
import { CORPUS, searchCorpus } from "./corpus";
import { systemPrompt } from "./local-agent";

export const askNex = createServerFn({ method: "POST" })
  .validator((input: { query: string; context: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "offline" };
    }
    const hits = searchCorpus(data.query, 5);
    const library =
      hits.length > 0
        ? hits.map((h) => `[${h.sourceLabel}] ${h.title}: ${h.body}`).join("\n")
        : CORPUS.slice(0, 6)
            .map((h) => `[${h.sourceLabel}] ${h.title}: ${h.body}`)
            .join("\n");
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt() },
          {
            role: "user",
            content: `Library:\n${library}\n\nDesk context:\n${data.context}\n\nQuestion:\n${data.query}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `xAI ${res.status}` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "empty" };
    return {
      ok: true as const,
      text,
      citations: hits.map((h) => ({
        title: h.title,
        source: h.sourceLabel,
        url: h.url,
      })),
    };
  });

/** User-initiated studio voice. Caps length. Falls back silently if the key is absent. */
export const speakNex = createServerFn({ method: "POST" })
  .validator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "offline" };
    const text = data.text.replace(/\s+/g, " ").trim().slice(0, 420);
    if (!text) return { ok: false as const, error: "empty" };
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text, voice_id: "eve", language: "en" }),
    });
    if (!res.ok) return { ok: false as const, error: `tts ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 80) return { ok: false as const, error: "empty" };
    return {
      ok: true as const,
      mime: res.headers.get("content-type") || "audio/mpeg",
      audio: buf.toString("base64"),
    };
  });
