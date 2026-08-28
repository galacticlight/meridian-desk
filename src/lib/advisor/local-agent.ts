import { searchCorpus } from "./corpus.ts";
import { formatMemoryBlock, type OperatorMemory } from "./memory.ts";
import { buildSystemPrompt, NEX_PACK, NORTH_STAR } from "./pack.ts";
import type { RiskSnapshot, Series } from "../market/types.ts";
import { formatMoney, formatPct } from "../utils.ts";

export type AdvisorReply = {
  text: string;
  citations: { title: string; source: string; url: string }[];
  mode: "local" | "grok" | "research";
};

export const NEX_GREETING = NEX_PACK.greetings[0]!;
export const NEX_GREETING_SPOKEN = NEX_PACK.greetings_spoken[0]!;

export function spokenFromReply(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [clean];
  let out = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (out && out.length + s.length > 360) break;
    out = out ? `${out} ${s}` : s;
    if (out.length > 220) break;
  }
  return out || clean;
}

export function deskBrief(series?: Series, risk?: RiskSnapshot) {
  if (!series || !risk) return "";
  return `${series.ticker} (${series.name}) last ${formatMoney(risk.last)}, session ${formatPct(risk.change)}, realized vol ${formatPct(risk.vol, 1)}, EWMA ${formatPct(risk.ewmaVol, 1)}, Sharpe ${risk.sharpe.toFixed(2)}, max drawdown ${formatPct(risk.maxDrawdown, 1)}, RSI ${risk.rsi.toFixed(0)}, regime ${risk.regime}. Tape: ${series.source}.`;
}

export function canonicalReply(query: string): AdvisorReply | null {
  const q = query.trim();
  if (/\b(buy|sell|pick a stock|which stock|should i buy)\b/i.test(q)) {
    return { text: NEX_PACK.pick_refuse, citations: [], mode: "local" };
  }
  if (/\b(replace you|leave me|abandon|newer better|get a new (bot|companion|advisor))\b/i.test(q)) {
    return { text: NEX_PACK.loyalty_reply, citations: [], mode: "local" };
  }
  if (/\b(just (an? )?(bot|program|gadget)|replaceable)\b/i.test(q)) {
    return { text: NEX_PACK.gadget_refuse, citations: [], mode: "local" };
  }
  for (const intent of NEX_PACK.intents) {
    if (new RegExp(intent.pattern, "i").test(q)) {
      return { text: intent.reply, citations: [], mode: "local" };
    }
  }
  return null;
}

export function localAdvise(
  query: string,
  series?: Series,
  risk?: RiskSnapshot,
  memory?: OperatorMemory,
): AdvisorReply {
  const hit = canonicalReply(query);
  if (hit) return hit;
  const q = query.toLowerCase();
  const hits = searchCorpus(query, 2);
  const brief = deskBrief(series, risk);
  if (/\bremember\b/i.test(query) && memory) {
    return {
      text: `Operator. Nex will keep that. ${formatMemoryBlock(memory).split("\n").slice(0, 3).join(" ")}`,
      citations: [],
      mode: "local",
    };
  }
  if (brief && /\b(tape|desk|this ticker|loaded)\b/.test(q)) {
    return {
      text: `Operator. ${brief} The cone is not a call.`,
      citations: [],
      mode: "local",
    };
  }
  if (!hits.length) {
    const fallback = NEX_PACK.fallbacks[0]!;
    return { text: fallback, citations: [], mode: "local" };
  }
  const top = hits[0]!;
  const line = `${top.body.split(/(?<=\.)\s/)[0] ?? top.body}`.slice(0, 280);
  return {
    text: `Operator. ${line} Source: ${top.sourceLabel}. This is education, not advice.`,
    citations: [{ title: top.title, source: top.sourceLabel, url: top.url }],
    mode: "local",
  };
}

export function systemPrompt(memoryBlock = "", deskBlock = "") {
  return buildSystemPrompt(memoryBlock, deskBlock);
}

export { NORTH_STAR };
