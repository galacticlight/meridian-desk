import { searchCorpus, type CorpusEntry } from "./corpus.ts";
import type { RiskSnapshot, Series } from "../market/types.ts";
import { formatMoney, formatPct } from "../utils.ts";

export type AdvisorReply = {
  text: string;
  citations: { title: string; source: string; url: string }[];
  mode: "local" | "grok";
};

function deskBrief(series?: Series, risk?: RiskSnapshot) {
  if (!series || !risk) return "";
  return `${series.ticker} (${series.name}) last ${formatMoney(risk.last)}, session ${formatPct(risk.change)}, realized vol ${formatPct(risk.vol, 1)}, EWMA vol ${formatPct(risk.ewmaVol, 1)}, Sharpe ${risk.sharpe.toFixed(2)}, max drawdown ${formatPct(risk.maxDrawdown, 1)}, RSI ${risk.rsi.toFixed(0)}, regime ${risk.regime}. Tape: ${series.source}.`;
}

function unique(entries: CorpusEntry[]) {
  const seen = new Set<string>();
  const out: CorpusEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

export function localAdvise(
  query: string,
  series?: Series,
  risk?: RiskSnapshot,
): AdvisorReply {
  const q = query.toLowerCase();
  const hits = searchCorpus(query, 4);
  const extra: CorpusEntry[] = [];
  if (/forecast|predict|lstm|gbm|garch|monte|cone|model/.test(q)) {
    extra.push(...searchCorpus("forecast garch gbm", 3));
  }
  if (/buy|sell|ticker|stock pick|should i/.test(q)) {
    extra.push(...searchCorpus("not advice allocation", 2));
  }
  if (/fraud|scam|guaranteed/.test(q)) extra.push(...searchCorpus("fraud red flags", 2));
  if (/fee|cost|expense/.test(q)) extra.push(...searchCorpus("fees cost", 2));
  if (/allocat|diversif|rebalanc|three.fund/.test(q)) {
    extra.push(...searchCorpus("allocation diversification", 3));
  }
  const used = unique([...hits, ...extra]).slice(0, 4);
  const brief = deskBrief(series, risk);

  let lead = "";
  if (/buy|sell|pick/.test(q)) {
    lead =
      "I will not pick a stock for you. Allocation, costs, horizon, and diversification are the levers that survive a noisy tape.";
  } else if (/forecast|predict/.test(q)) {
    lead =
      "The cone on this desk is a distribution, not a target. Literature on GBM, GARCH, and even LSTM-class nets still shows directional accuracy near chance out of sample.";
  } else if (brief && /this|ticker|tape|now|current/.test(q)) {
    lead = `On the loaded tape: ${brief}`;
  }

  const intro = brief && !lead.startsWith("On the loaded") ? brief : "";
  if (!used.length) {
    return {
      text: [
        lead || intro,
        "I do not have a matching passage in the local library. Ask about allocation, costs, diversification, forecast limits, drawdowns, or fraud red flags.",
        "I am an educational companion, not a registered adviser.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      citations: [],
      mode: "local",
    };
  }

  const body = used.map((h) => `${h.title}. ${h.body}`).join("\n\n");
  return {
    text: [
      lead || intro,
      `Local library on “${query.trim()}”:`,
      body,
      "Use this as a map, not a trade ticket. This is education, not advice.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    citations: used.map((h) => ({
      title: h.title,
      source: h.sourceLabel,
      url: h.url,
    })),
    mode: "local",
  };
}

export function systemPrompt() {
  return `You are Nex, the on-desk research companion for Meridian Desk — a local market laboratory. You are calm, precise, and slightly dry. You never give personalized buy/sell recommendations. You explain risk, process, and literature.

You may use the attached library excerpts (Investopedia, Fidelity Learning Center, SEC Investor.gov, Vanguard Principles, CFA Institute). Cite them by name in prose. If the user asks you to pick a stock, refuse the pick and redirect to allocation, costs, horizon, and diversification.

Keep answers under 220 words. End with a one-line reminder that this is education, not advice.`;
}
