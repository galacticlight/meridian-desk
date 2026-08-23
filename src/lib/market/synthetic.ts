import { gaussian, hashTicker, mulberry32 } from "./math.ts";
import type { Bar, Series } from "./types.ts";

const PROFILES: Record<string, { start: number; mu: number; sigma: number; name: string }> = {
  AAPL: { start: 188, mu: 0.16, sigma: 0.28, name: "Apple Inc." },
  MSFT: { start: 420, mu: 0.15, sigma: 0.24, name: "Microsoft Corp." },
  GOOGL: { start: 165, mu: 0.14, sigma: 0.27, name: "Alphabet Inc." },
  AMZN: { start: 185, mu: 0.18, sigma: 0.32, name: "Amazon.com Inc." },
  NVDA: { start: 110, mu: 0.28, sigma: 0.48, name: "NVIDIA Corp." },
  TSLA: { start: 175, mu: 0.22, sigma: 0.62, name: "Tesla Inc." },
  META: { start: 510, mu: 0.17, sigma: 0.36, name: "Meta Platforms" },
  SPY: { start: 520, mu: 0.1, sigma: 0.16, name: "SPDR S&P 500" },
  QQQ: { start: 460, mu: 0.13, sigma: 0.22, name: "Invesco QQQ" },
  IWM: { start: 205, mu: 0.09, sigma: 0.22, name: "iShares Russell 2000" },
};

export function synthesizeSeries(ticker: string, days = 504): Series {
  const t = ticker.toUpperCase();
  const profile = PROFILES[t] ?? {
    start: 80 + (hashTicker(t) % 220),
    mu: 0.08 + ((hashTicker(t) % 20) / 100),
    sigma: 0.18 + ((hashTicker(t) % 25) / 100),
    name: `${t} (synthetic tape)`,
  };
  const rand = mulberry32(hashTicker(t) ^ 0xc0ffee);
  const bars: Bar[] = [];
  let price = profile.start;
  const start = Date.UTC(2024, 0, 2);
  let i = 0;
  while (bars.length < days) {
    const d = new Date(start + i * 86400000);
    i++;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const shock = gaussian(rand);
    const ret =
      (profile.mu - 0.5 * profile.sigma ** 2) / 252 +
      profile.sigma * Math.sqrt(1 / 252) * shock;
    const open = price * (1 + (rand() - 0.5) * 0.004);
    const close = Math.max(1, price * Math.exp(ret));
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low = Math.min(open, close) * (1 - rand() * 0.012);
    const volume = Math.round(8_000_000 + rand() * 40_000_000);
    bars.push({
      date: d.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return {
    ticker: t,
    name: profile.name,
    currency: "USD",
    source: "simulated",
    bars,
  };
}
