export type ChatTurn = { role: "you" | "nex"; text: string };

export function extractResponse(body: unknown): {
  text: string;
  citations: { title: string; source: string; url: string }[];
} {
  const b = body as Record<string, unknown>;
  const chunks: string[] = [];
  if (typeof b.output_text === "string") chunks.push(b.output_text);
  const output = Array.isArray(b.output) ? b.output : [];
  for (const item of output) {
    const row = item as { type?: string; content?: unknown[] };
    if (row.type !== "message" && row.type !== "output_text") continue;
    const content = Array.isArray(row.content) ? row.content : [];
    for (const c of content) {
      const part = c as { type?: string; text?: string };
      if (typeof part.text === "string") chunks.push(part.text);
    }
  }
  const text = chunks
    .join("\n")
    .trim();
  const citations: { title: string; source: string; url: string }[] = [];
  const raw = Array.isArray(b.citations) ? b.citations : [];
  for (const c of raw) {
    if (typeof c === "string" && c.startsWith("http")) {
      citations.push({ url: c, title: c.replace(/^https?:\/\//, "").slice(0, 48), source: hostSource(c) });
    } else if (c && typeof c === "object") {
      const o = c as { url?: string; title?: string; source?: string };
      if (o.url) {
        citations.push({
          url: o.url,
          title: o.title || o.url,
          source: o.source || hostSource(o.url),
        });
      }
    }
  }
  return { text, citations };
}

function hostSource(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h === "x.com" || h === "twitter.com") return "X";
    return "Web";
  } catch {
    return "Web";
  }
}
