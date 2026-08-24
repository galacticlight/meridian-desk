import type { RiskSnapshot, Series } from "../market/types.ts";
import { formatMoney, formatPct } from "../utils.ts";
import type { AdvisorReply } from "./local-agent.ts";

export function isTimeQuery(query: string) {
  return /\b(what time|date is it|what day|clock|timezone|pacific time)\b/i.test(query);
}

export function isTapeQuery(query: string) {
  return /\b(tape|loaded|this ticker|this name|how('?s| is) (aapl|msft|spy|qqq|the market)|brief me|desk status|what('?s| is) on (the )?desk)\b/i.test(
    query,
  );
}

export function clockReply(timeZone = "America/Los_Angeles"): AdvisorReply {
  const now = new Date();
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(now);
  return {
    text: `Operator. It is ${when}. I am using Pacific time unless you name another zone.`,
    citations: [],
    mode: "local",
  };
}

export function tapeReply(series?: Series, risk?: RiskSnapshot): AdvisorReply {
  if (!series || !risk) {
    return {
      text: "Operator. No tape is loaded. Open the desk and load a symbol, then ask me again.",
      citations: [],
      mode: "local",
    };
  }
  const tone =
    risk.regime === "stress"
      ? "Stress regime: moves are clustering. Position size and horizon matter more than a point forecast."
      : risk.regime === "elevated"
        ? "Elevated regime: volatility is running hot versus its recent calm. The cone should be read as a range, not a target."
        : "Calm regime: realized vol is contained. That is a description of the recent tape, not a promise it stays that way.";
  return {
    text: [
      `Operator. ${series.ticker} (${series.name}) last ${formatMoney(risk.last)}, session ${formatPct(risk.change)}, realized vol ${formatPct(risk.vol, 1)}, EWMA ${formatPct(risk.ewmaVol, 1)}, Sharpe ${risk.sharpe.toFixed(2)}, max drawdown ${formatPct(risk.maxDrawdown, 1)}, RSI ${risk.rsi.toFixed(0)}. Source: ${series.source}.`,
      tone,
      "I will not call a direction. Education, not advice.",
    ].join("\n\n"),
    citations: [],
    mode: "local",
  };
}

export function followUps(query: string, series?: Series): string[] {
  const q = query.toLowerCase();
  if (/\bweather\b/.test(q)) return ["What's the weather in London?", "What time is it?"];
  if (/\btime\b|\bclock\b|\bdate\b/.test(q)) return ["What's the weather in Seattle?", "Brief me on the tape."];
  if (/\btape\b|\bdesk\b|ticker/.test(q)) {
    return ["What can this forecast actually tell me?", series ? `Explain ${series.ticker}'s regime.` : "How should I think about asset allocation?"];
  }
  if (/allocat|diversif/.test(q)) return ["What are SEC fraud red flags?", "Brief me on the tape."];
  return ["Brief me on the tape.", "What's the weather in Seattle?"];
}
