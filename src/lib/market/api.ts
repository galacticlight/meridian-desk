import { createServerFn } from "@tanstack/react-start";
import { synthesizeSeries } from "./synthetic";
import type { Bar, Series } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function parseTickers(raw: string) {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.trim().toUpperCase())
    .filter((t) => /^[A-Z.]{1,8}$/.test(t))
    .slice(0, 6);
}

async function fetchYahoo(ticker: string): Promise<Series | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2y`;
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
  if (bars.length < 40) return null;
  return {
    ticker,
    name: result?.meta?.shortName ?? ticker,
    currency: result?.meta?.currency ?? "USD",
    source: "live",
    bars,
  };
}

async function fetchStooq(ticker: string): Promise<Series | null> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(ticker.toLowerCase())}.us&i=d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const text = await res.text();
  const lines = text.trim().split("\n").slice(1);
  const bars: Bar[] = [];
  for (const line of lines) {
    const [date, open, high, low, close, volume] = line.split(",");
    const c = Number(close);
    if (!date || !Number.isFinite(c)) continue;
    bars.push({
      date,
      open: Number(open) || c,
      high: Number(high) || c,
      low: Number(low) || c,
      close: c,
      volume: Number(volume) || 0,
    });
  }
  const last2y = bars.slice(-520);
  if (last2y.length < 40) return null;
  return {
    ticker,
    name: ticker,
    currency: "USD",
    source: "live",
    bars: last2y,
  };
}

export const loadMarket = createServerFn({ method: "POST" })
  .validator((input: { tickers: string }) => input)
  .handler(async ({ data }) => {
    const tickers = parseTickers(data.tickers);
    if (!tickers.length) return { series: [] as Series[], note: "Enter a ticker." };
    const series: Series[] = [];
    for (const t of tickers) {
      try {
        const live = (await fetchYahoo(t)) ?? (await fetchStooq(t));
        series.push(live ?? synthesizeSeries(t));
      } catch {
        series.push(synthesizeSeries(t));
      }
    }
    const simulated = series.some((s) => s.source === "simulated");
    return {
      series,
      note: simulated
        ? "Some names used a calibrated synthetic tape because the live feed was unavailable."
        : "Live daily bars from public market feeds.",
    };
  });
