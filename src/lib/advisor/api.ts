import { createServerFn } from "@tanstack/react-start";
import { CORPUS, searchCorpus } from "./corpus";
import { systemPrompt } from "./local-agent";
import { listInstalledMacVoices, renderMacSpeech } from "./mac-say";
import { extractResponse, type ChatTurn } from "./response";

export const askNex = createServerFn({ method: "POST" })
  .validator(
    (input: { query: string; context: string; history?: ChatTurn[]; research?: boolean }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "offline" };

    const hits = searchCorpus(data.query, 5);
    const library =
      hits.length > 0
        ? hits.map((h) => `[${h.sourceLabel}] ${h.title}: ${h.body}`).join("\n")
        : CORPUS.slice(0, 5)
            .map((h) => `[${h.sourceLabel}] ${h.title}: ${h.body}`)
            .join("\n");

    const prior = (data.history ?? []).slice(-8).map((t) => ({
      role: t.role === "you" ? "user" : "assistant",
      content: t.text.slice(0, 800),
    }));

    if (data.research) {
      const res = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_output_tokens: 500,
          input: [
            { role: "system", content: systemPrompt() },
            ...prior,
            {
              role: "user",
              content: `Local library:\n${library}\n\nDesk:\n${data.context}\n\nOperator:\n${data.query}`,
            },
          ],
          tools: [{ type: "web_search" }, { type: "x_search" }],
        }),
      });
      if (res.ok) {
        const parsed = extractResponse(await res.json());
        if (parsed.text) {
          return {
            ok: true as const,
            text: parsed.text,
            citations:
              parsed.citations.length > 0
                ? parsed.citations
                : hits.map((h) => ({ title: h.title, source: h.sourceLabel, url: h.url })),
            mode: "research" as const,
          };
        }
      }
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        temperature: 0.45,
        messages: [
          { role: "system", content: systemPrompt() },
          ...prior,
          {
            role: "user",
            content: `Library:\n${library}\n\nDesk context:\n${data.context}\n\nQuestion:\n${data.query}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI ${res.status}` };
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
      mode: "grok" as const,
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
