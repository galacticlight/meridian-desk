import { createServerFn } from "@tanstack/react-start";
import { CORPUS, searchCorpus } from "./corpus";
import { systemPrompt } from "./local-agent";
import { listInstalledMacVoices, renderMacSpeech } from "./mac-say";

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

export const listMacVoices = createServerFn({ method: "GET" }).handler(async () => {
  const voices = await listInstalledMacVoices();
  return { ok: true as const, voices };
});

export const speakMac = createServerFn({ method: "POST" })
  .validator((input: { text: string; voice?: string }) => input)
  .handler(async ({ data }) => {
    const rendered = await renderMacSpeech(data.text, data.voice);
    if (!rendered) return { ok: false as const, error: "unavailable" };
    return { ok: true as const, ...rendered };
  });
