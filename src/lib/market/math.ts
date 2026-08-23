export function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
}

export function stdev(xs: number[]) {
  return Math.sqrt(Math.max(0, variance(xs)));
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function logReturns(closes: number[]) {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1]!;
    const b = closes[i]!;
    if (a > 0 && b > 0) r.push(Math.log(b / a));
  }
  return r;
}

export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashTicker(ticker: string) {
  let h = 2166136261;
  for (let i = 0; i < ticker.length; i++) {
    h ^= ticker.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gaussian(rand: () => number) {
  const u = Math.max(1e-12, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Student-t via polar Gaussian / chi-square (df ≥ 3). Fatter tails than GBM. */
export function studentT(rand: () => number, df = 6) {
  const z = gaussian(rand);
  let chi = 0;
  for (let i = 0; i < df; i++) {
    const g = gaussian(rand);
    chi += g * g;
  }
  return z / Math.sqrt(chi / df);
}

export function ewmaVol(returns: number[], lambda = 0.94) {
  if (!returns.length) return 0;
  let v = variance(returns);
  for (const r of returns) {
    v = lambda * v + (1 - lambda) * r * r;
  }
  return Math.sqrt(Math.max(0, v));
}

export function cholesky(matrix: number[][]) {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i]![k]! * L[j]![k]!;
      if (i === j) {
        L[i]![j] = Math.sqrt(Math.max(1e-12, matrix[i]![i]! - sum));
      } else {
        L[i]![j] = (matrix[i]![j]! - sum) / L[j]![j]!;
      }
    }
  }
  return L;
}

export function covariance(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const aa = a.slice(-n);
  const bb = b.slice(-n);
  const ma = mean(aa);
  const mb = mean(bb);
  let s = 0;
  for (let i = 0; i < n; i++) s += (aa[i]! - ma) * (bb[i]! - mb);
  return s / (n - 1);
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function maxDrawdown(closes: number[]) {
  let peak = closes[0] ?? 0;
  let dd = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    if (peak > 0) dd = Math.min(dd, c / peak - 1);
  }
  return dd;
}

export function annualizeMean(daily: number) {
  return daily * 252;
}

export function annualizeVol(dailyStd: number) {
  return dailyStd * Math.sqrt(252);
}
