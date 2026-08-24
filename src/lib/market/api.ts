import { createServerFn } from "@tanstack/react-start";
import { barsFromNasdaq, looksLikeTicker, parseMoney } from "./nasdaq";
import type { Bar, Series } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const NASDAQ_HEADERS = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
};

function tokens(raw: string) {
  return raw
    .split(/[,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function searchNasdaq(query: string) {
  const url = `https://api.nasdaq.com/api/autocomplete/slookup/10?search=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: NASDAQ_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [] as { symbol: string; name: string; asset: string }[];
  const json = (await res.json()) as {
    data?: { symbol?: string; name?: string; asset?: string }[];
  };
  return (json.data ?? [])
    .filter((d) => d.symbol)
    .map((d) => ({
      symbol: d.symbol!.toUpperCase(),
      name: d.name ?? d.symbol!,
      asset: (d.asset ?? "STOCKS").toLowerCase() === "etf" ? "etf" : "stocks",
    }));
}

async function fetchNasdaq(ticker: string, assetClass: "stocks" | "etf"): Promise<Series | null> {
  const today = new Date();
  const from = new Date(today);
  from.setFullYear(today.getFullYear() - 2);
  const fromdate = from.toISOString().slice(0, 10);
  const todate = today.toISOString().slice(0, 10);
  const histUrl = `https://api.nasdaq.com/api/quote/${encodeURIComponent(ticker)}/historical?assetclass=${assetClass}&fromdate=${fromdate}&todate=${todate}&limit=9999`;
  const infoUrl = `https://api.nasdaq.com/api/quote/${encodeURIComponent(ticker)}/info?assetclass=${assetClass}`;
  const [histRes, infoRes] = await Promise.all([
    fetch(histUrl, { headers: NASDAQ_HEADERS, signal: AbortSignal.timeout(12000) }),
    fetch(infoUrl, { headers: NASDAQ_HEADERS, signal: AbortSignal.timeout(8000) }),
  ]);
  if (!histRes.ok) return null;
  const hist = (await histRes.json()) as {
    data?: { tradesTable?: { rows?: Parameters<typeof barsFromNasdaq>[0] } };
  };
  const bars = barsFromNasdaq(hist.data?.tradesTable?.rows ?? []);
  if (bars.length < 5) return null;
  let name = ticker;
  if (infoRes.ok) {
    const info = (await infoRes.json()) as {
      data?: { companyName?: string; primaryData?: { lastSalePrice?: string } };
    };
    name = info.data?.companyName ?? ticker;
    const last = parseMoney(info.data?.primaryData?.lastSalePrice);
    const tail = bars.at(-1);
    if (last != null && tail && tail.close !== last) {
      bars[bars.length - 1] = { ...tail, close: last };
    }
  }
  return {
    ticker,
    name,
    currency: "USD",
    source: "live",
    bars,
  };
}

async function fetchYahoo(ticker: string): Promise<Series | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2y`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    chart?: {
      result?: {
        meta?: { shortName?: string; currency?: string };
        timestamp?: number[];
        indicators?: {
          quote?: {
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }[];
        };
      }[];
    };
  };
  const result = json.chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  if (!ts?.length || !q?.close) return null;
  const bars: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close[i];
    const open = q.open?.[i] ?? close;
    const high = q.high?.[i] ?? close;
    const low = q.low?.[i] ?? close;
    const volume = q.volume?.[i] ?? 0;
    if (close == null || open == null || high == null || low == null) continue;
    bars.push({
      date: new Date(ts[i]! * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
  }
  if (bars.length < 5) return null;
  return {
    ticker,
    name: result?.meta?.shortName ?? ticker,
    currency: result?.meta?.currency ?? "USD",
    source: "live",
    bars,
  };
}

async function liveSeries(ticker: string, assetHint?: string): Promise<Series | null> {
  const order: ("stocks" | "etf")[] =
    assetHint === "etf" ? ["etf", "stocks"] : ["stocks", "etf"];
  for (const cls of order) {
    try {
      const hit = await fetchNasdaq(ticker, cls);
      if (hit) return hit;
    } catch {
      /* next */
    }
  }
  try {
    return await fetchYahoo(ticker);
  } catch {
    return null;
  }
}

export const loadMarket = createServerFn({ method: "POST" })
  .validator((input: { tickers: string }) => input)
  .handler(async ({ data }) => {
    const parts = tokens(data.tickers);
    if (!parts.length) return { series: [] as Series[], note: "Enter a ticker or company name.", misses: [] as string[] };
    const series: Series[] = [];
    const misses: string[] = [];
    for (const part of parts) {
      const symbols: { symbol: string; asset?: string }[] = [];
      if (looksLikeTicker(part)) symbols.push({ symbol: part.toUpperCase() });
      try {
        const found = await searchNasdaq(part);
        for (const f of found) {
          if (!symbols.some((s) => s.symbol === f.symbol)) symbols.push({ symbol: f.symbol, asset: f.asset });
        }
      } catch {
        /* search optional */
      }
      let loaded: Series | null = null;
      for (const cand of symbols.slice(0, 3)) {
        loaded = await liveSeries(cand.symbol, cand.asset);
        if (loaded) break;
      }
      if (loaded) series.push(loaded);
      else misses.push(part.toUpperCase());
    }
    const note = series.length
      ? `Live daily bars from Nasdaq${misses.length ? `. No live tape for ${misses.join(", ")}` : ""}.`
      : misses.length
        ? `No live tape for ${misses.join(", ")}. Check the symbol, or search the company name.`
        : "Enter a ticker or company name.";
    return { series, note, misses };
  });
