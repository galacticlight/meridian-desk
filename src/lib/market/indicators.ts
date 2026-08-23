import { mean, stdev } from "./math.ts";

export function sma(values: number[], window: number) {
  if (values.length < window) return values.at(-1) ?? 0;
  return mean(values.slice(-window));
}

export function ema(values: number[], window: number) {
  if (!values.length) return 0;
  const k = 2 / (window + 1);
  let e = values[0]!;
  for (let i = 1; i < values.length; i++) {
    e = values[i]! * k + e * (1 - k);
  }
  return e;
}

export function rsi(closes: number[], window = 14) {
  if (closes.length < window + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - window; i < closes.length; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function bollinger(closes: number[], window = 20) {
  const slice = closes.slice(-window);
  const mid = mean(slice);
  const sd = stdev(slice);
  return { mid, upper: mid + 2 * sd, lower: mid - 2 * sd };
}

export function macd(closes: number[]) {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const line = fast - slow;
  return { line, signal: line * 0.2 + slow * 0, hist: line };
}
