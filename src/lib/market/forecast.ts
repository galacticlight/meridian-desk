import { rsi, sma } from "./indicators.ts";
import {
  annualizeMean,
  annualizeVol,
  cholesky,
  covariance,
  ewmaVol,
  gaussian,
  logReturns,
  maxDrawdown,
  mean,
  mulberry32,
  percentile,
  stdev,
  studentT,
  variance,
} from "./math.ts";
import type {
  ForecastBand,
  ForecastResult,
  Horizon,
  ModelId,
  RiskSnapshot,
  Series,
} from "./types.ts";
import { HORIZON_DAYS } from "./types.ts";

const DT = 1 / 252;

function closesOf(series: Series) {
  return series.bars.map((b) => b.close).filter((n) => n > 0);
}

function bandsFromPaths(paths: number[][]): ForecastBand[] {
  if (!paths.length) return [];
  const days = paths[0]!.length;
  const bands: ForecastBand[] = [];
  for (let d = 0; d < days; d++) {
    const col = paths.map((p) => p[d]!).sort((a, b) => a - b);
    bands.push({
      day: d,
      p05: percentile(col, 0.05),
      p25: percentile(col, 0.25),
      median: percentile(col, 0.5),
      p75: percentile(col, 0.75),
      p95: percentile(col, 0.95),
    });
  }
  return bands;
}

function sample(paths: number[][], n = 24) {
  if (paths.length <= n) return paths;
  const step = Math.floor(paths.length / n);
  return paths.filter((_, i) => i % step === 0).slice(0, n);
}

function walkForward(
  actual: number[],
  predicted: number[],
): ForecastResult["backtest"] {
  const n = Math.min(actual.length, predicted.length);
  if (n < 3) return { mae: 0, rmse: 0, directional: 50, holdout: n };
  let mae = 0;
  let sse = 0;
  let hits = 0;
  let dirN = 0;
  for (let i = 0; i < n; i++) {
    const err = actual[i]! - predicted[i]!;
    mae += Math.abs(err);
    sse += err * err;
    if (i > 0) {
      const da = actual[i]! - actual[i - 1]!;
      const dp = predicted[i]! - predicted[i - 1]!;
      if (da * dp > 0) hits++;
      dirN++;
    }
  }
  return {
    mae: mae / n,
    rmse: Math.sqrt(sse / n),
    directional: dirN ? (hits / dirN) * 100 : 50,
    holdout: n,
  };
}

function gbmPath(
  start: number,
  days: number,
  mu: number,
  sigma: number,
  rand: () => number,
) {
  const path = [start];
  let s = start;
  for (let i = 0; i < days; i++) {
    const z = gaussian(rand);
    s = s * Math.exp((mu - 0.5 * sigma * sigma) * DT + sigma * Math.sqrt(DT) * z);
    path.push(Math.max(0.01, s));
  }
  return path;
}

function fitMuSigma(returns: number[]) {
  const mu = annualizeMean(mean(returns));
  const sigma = Math.max(0.05, annualizeVol(stdev(returns)));
  return { mu, sigma };
}

function forecastGbm(
  last: number,
  returns: number[],
  days: number,
  nPaths: number,
  seed: number,
  sigmaOverride?: number,
) {
  const { mu, sigma: s0 } = fitMuSigma(returns);
  const sigma = sigmaOverride ?? s0;
  const rand = mulberry32(seed);
  const paths = Array.from({ length: nPaths }, () =>
    gbmPath(last, days, mu, sigma, rand),
  );
  return { mu, sigma, paths };
}

/** GARCH(1,1) with Student-t shocks — volatility clustering + fat tails. */
function forecastGarch(
  last: number,
  returns: number[],
  days: number,
  nPaths: number,
  seed: number,
) {
  const { mu } = fitMuSigma(returns);
  const v = Math.max(1e-8, variance(returns));
  const alpha = 0.08;
  const beta = 0.9;
  const omega = Math.max(1e-10, v * (1 - alpha - beta));
  let h = v;
  for (const r of returns) {
    h = omega + alpha * r * r + beta * h;
  }
  const rand = mulberry32(seed ^ 0xc0de);
  const paths: number[][] = [];
  for (let p = 0; p < nPaths; p++) {
    const path = [last];
    let s = last;
    let ht = h;
    for (let i = 0; i < days; i++) {
      const z = studentT(rand, 6);
      const shock = Math.sqrt(Math.max(ht, 1e-12)) * z;
      s = Math.max(0.01, s * Math.exp(mean(returns) + shock));
      path.push(s);
      ht = omega + alpha * shock * shock + beta * ht;
    }
    paths.push(path);
  }
  return {
    mu,
    sigma: annualizeVol(Math.sqrt(h)),
    paths,
    note: "GARCH(1,1) variance targeting with Student-t(6) shocks.",
  };
}

/** Moving-block bootstrap preserves short serial correlation. */
function forecastBootstrap(
  last: number,
  returns: number[],
  days: number,
  nPaths: number,
  seed: number,
) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const pool = returns.length ? returns : [0];
  const block = Math.min(8, Math.max(3, Math.floor(Math.sqrt(pool.length))));
  const paths: number[][] = [];
  for (let p = 0; p < nPaths; p++) {
    const path = [last];
    let s = last;
    while (path.length <= days) {
      const start = Math.floor(rand() * pool.length);
      for (let k = 0; k < block && path.length <= days; k++) {
        const r = pool[(start + k) % pool.length]!;
        s = Math.max(0.01, s * Math.exp(r));
        path.push(s);
      }
    }
    paths.push(path.slice(0, days + 1));
  }
  const { mu, sigma } = fitMuSigma(returns);
  return { mu, sigma, paths, note: `Block bootstrap, length ${block}.` };
}

function forecastAr1(
  last: number,
  returns: number[],
  days: number,
  nPaths: number,
  seed: number,
) {
  const { mu, sigma } = fitMuSigma(returns);
  let num = 0;
  let den = 0;
  for (let i = 1; i < returns.length; i++) {
    num += returns[i]! * returns[i - 1]!;
    den += returns[i - 1]! ** 2;
  }
  const phi = den > 0 ? Math.max(-0.95, Math.min(0.95, num / den)) : 0;
  const dailyMu = mean(returns);
  const residStd = stdev(
    returns.slice(1).map((r, i) => r - dailyMu - phi * (returns[i]! - dailyMu)),
  );
  const rand = mulberry32(seed ^ 0x51ed);
  const paths: number[][] = [];
  for (let p = 0; p < nPaths; p++) {
    const path = [last];
    let s = last;
    let prev = returns.at(-1) ?? 0;
    for (let i = 0; i < days; i++) {
      const next = dailyMu + phi * (prev - dailyMu) + residStd * gaussian(rand);
      s = Math.max(0.01, s * Math.exp(next));
      path.push(s);
      prev = next;
    }
    paths.push(path);
  }
  return { mu, sigma, paths, note: `AR(1) φ = ${phi.toFixed(2)}.` };
}

function tanh(x: number) {
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

/** Small Elman net trained on lagged log-returns. Educational local sequence model. */
function forecastSequence(
  last: number,
  returns: number[],
  days: number,
  nPaths: number,
  seed: number,
) {
  const { mu, sigma } = fitMuSigma(returns);
  const sampleR = returns.length > 180 ? returns.slice(-180) : returns;
  const window = 8;
  const hidden = 6;
  const rand = mulberry32(seed ^ 0xa5a5);
  const wIn = Array.from({ length: hidden }, () =>
    Array.from({ length: window }, () => (rand() - 0.5) * 0.4),
  );
  const wH = Array.from({ length: hidden }, () =>
    Array.from({ length: hidden }, () => (rand() - 0.5) * 0.4),
  );
  const bH = Array.from({ length: hidden }, () => 0);
  const wOut = Array.from({ length: hidden }, () => (rand() - 0.5) * 0.4);
  let bOut = 0;
  const h = Array.from({ length: hidden }, () => 0);
  const lr = 0.04;
  const epochs = 8;
  if (sampleR.length > window + 4) {
    for (let ep = 0; ep < epochs; ep++) {
      for (let t = window; t < sampleR.length; t++) {
        const x = sampleR.slice(t - window, t);
        const target = sampleR[t]!;
        const hPrev = h.slice();
        for (let j = 0; j < hidden; j++) {
          let s = bH[j]!;
          for (let i = 0; i < window; i++) s += wIn[j]![i]! * x[i]!;
          for (let k = 0; k < hidden; k++) s += wH[j]![k]! * hPrev[k]!;
          h[j] = tanh(s);
        }
        let y = bOut;
        for (let j = 0; j < hidden; j++) y += wOut[j]! * h[j]!;
        const err = y - target;
        bOut -= lr * err;
        for (let j = 0; j < hidden; j++) {
          wOut[j] = wOut[j]! - lr * err * h[j]!;
          const dh = (1 - h[j]! * h[j]!) * err * wOut[j]!;
          bH[j] = bH[j]! - lr * dh;
          for (let i = 0; i < window; i++) {
            wIn[j]![i] = wIn[j]![i]! - lr * dh * x[i]!;
          }
        }
      }
    }
  }
  const resid = stdev(returns) * 0.9;
  const paths: number[][] = [];
  for (let p = 0; p < nPaths; p++) {
    const path = [last];
    let s = last;
    let buf = sampleR.slice(-window);
    while (buf.length < window) buf = [0, ...buf];
    const hh = Array.from({ length: hidden }, () => 0);
    for (let d = 0; d < days; d++) {
      for (let j = 0; j < hidden; j++) {
        let sum = bH[j]!;
        for (let i = 0; i < window; i++) sum += wIn[j]![i]! * buf[i]!;
        hh[j] = tanh(sum);
      }
      let y = bOut;
      for (let j = 0; j < hidden; j++) y += wOut[j]! * hh[j]!;
      y += resid * gaussian(rand) * 0.65;
      s = Math.max(0.01, s * Math.exp(y));
      path.push(s);
      buf = [...buf.slice(1), y];
    }
    paths.push(path);
  }
  return {
    mu,
    sigma,
    paths,
    note: "On-device Elman net on 8 lagged log-returns (local CPU).",
  };
}

/** Two-state Markov vol regime: calm vs stress, then GBM in each state. */
function forecastRegime(
  last: number,
  returns: number[],
  days: number,
  nPaths: number,
  seed: number,
) {
  const { mu } = fitMuSigma(returns);
  const thr = stdev(returns);
  const states = returns.map((r) => (Math.abs(r) > 1.25 * thr ? 1 : 0));
  let n00 = 1;
  let n01 = 1;
  let n10 = 1;
  let n11 = 1;
  for (let i = 1; i < states.length; i++) {
    const a = states[i - 1]!;
    const b = states[i]!;
    if (a === 0 && b === 0) n00++;
    else if (a === 0 && b === 1) n01++;
    else if (a === 1 && b === 0) n10++;
    else n11++;
  }
  const p01 = n01 / (n00 + n01);
  const p10 = n10 / (n10 + n11);
  const calm = returns.filter((_, i) => states[i] === 0);
  const stress = returns.filter((_, i) => states[i] === 1);
  const sig0 = Math.max(0.08, annualizeVol(stdev(calm.length ? calm : returns)));
  const sig1 = Math.max(sig0, annualizeVol(stdev(stress.length ? stress : returns)) * 1.15);
  const rand = mulberry32(seed ^ 0x1111);
  const startState = states.at(-1) ?? 0;
  const paths: number[][] = [];
  for (let p = 0; p < nPaths; p++) {
    const path = [last];
    let s = last;
    let st = startState;
    for (let i = 0; i < days; i++) {
      const flip = rand();
      if (st === 0 && flip < p01) st = 1;
      else if (st === 1 && flip < p10) st = 0;
      const sigma = st === 0 ? sig0 : sig1;
      const z = gaussian(rand);
      s = s * Math.exp((mu - 0.5 * sigma * sigma) * DT + sigma * Math.sqrt(DT) * z);
      path.push(Math.max(0.01, s));
    }
    paths.push(path);
  }
  return {
    mu,
    sigma: sig1,
    paths,
    note: `Two-state Markov vol. P(calm→stress)=${p01.toFixed(2)}, σ_stress=${(sig1 * 100).toFixed(0)}%.`,
  };
}

function holdoutActual(closes: number[], days: number) {
  const n = Math.min(days, Math.floor(closes.length * 0.2));
  if (n < 5) return { actual: [] as number[], trainEnd: closes.length - 1 };
  return {
    actual: closes.slice(-n),
    trainEnd: closes.length - n,
  };
}

export function runForecast(
  series: Series,
  model: ModelId,
  horizon: Horizon,
  pathCount = 240,
): ForecastResult {
  const closes = closesOf(series);
  const last = closes.at(-1) ?? 0;
  const days = HORIZON_DAYS[horizon];
  const returns = logReturns(closes);
  const seed = series.ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 1);
  const { actual, trainEnd } = holdoutActual(closes, days);
  const trainLast = closes[trainEnd] ?? last;

  const run = (id: ModelId, n = pathCount) => {
    if (id === "bootstrap") return forecastBootstrap(last, returns, days, n, seed);
    if (id === "ar1") return forecastAr1(last, returns, days, n, seed);
    if (id === "sequence") return forecastSequence(last, returns, days, n, seed);
    if (id === "garch") return forecastGarch(last, returns, days, n, seed);
    if (id === "regime") return forecastRegime(last, returns, days, n, seed);
    return forecastGbm(last, returns, days, n, seed);
  };

  let produced;
  let note = "";
  if (model === "ensemble") {
    const parts = [
      forecastGbm(last, returns, days, 70, seed),
      forecastGarch(last, returns, days, 70, seed + 2),
      forecastBootstrap(last, returns, days, 70, seed + 3),
      forecastAr1(last, returns, days, 70, seed + 7),
    ];
    produced = {
      mu: mean(parts.map((p) => p.mu)),
      sigma: mean(parts.map((p) => p.sigma)),
      paths: parts.flatMap((p) => p.paths),
    };
    note = "Median blend of GBM, GARCH-t, block bootstrap, and AR(1).";
  } else {
    produced = run(model);
    const extra = "note" in produced ? (produced as { note?: string }).note : undefined;
    note = extra && extra.length > 0 ? extra : MODEL_NOTES[model];
  }

  let backtest = { mae: 0, rmse: 0, directional: 50, holdout: 0 };
  if (actual.length > 4) {
    const bt = run(model === "ensemble" ? "gbm" : model, 80);
    const start = trainLast;
    const med = bandsFromPaths(bt.paths).map((b) => b.median);
    const aligned = actual.map((_, i) => med[Math.min(i, med.length - 1)] ?? start);
    backtest = walkForward(actual, aligned);
  }

  const bands = bandsFromPaths(produced.paths);
  return {
    model,
    last,
    mu: produced.mu,
    sigma: produced.sigma,
    bands,
    samplePaths: sample(produced.paths, 20),
    expected: bands.at(-1)?.median ?? last,
    backtest,
    note,
  };
}

const MODEL_NOTES: Record<ModelId, string> = {
  ensemble: "Median blend of GBM, GARCH-t, block bootstrap, and AR(1).",
  gbm: "Geometric Brownian motion with historically estimated μ and σ.",
  garch: "GARCH(1,1) variance targeting with Student-t shocks.",
  bootstrap: "Moving-block bootstrap of historical log-returns.",
  ar1: "Mean-reverting AR(1) on log-returns plus residual shocks.",
  sequence: "Local Elman recurrent net trained on lagged returns.",
  regime: "Two-state Markov volatility regime feeding GBM.",
};

export function riskSnapshot(series: Series): RiskSnapshot {
  const closes = closesOf(series);
  const last = closes.at(-1) ?? 0;
  const prev = closes.at(-2) ?? last;
  const returns = logReturns(closes);
  const vol = annualizeVol(stdev(returns));
  const ewma = annualizeVol(ewmaVol(returns, 0.94));
  const mu = annualizeMean(mean(returns));
  const rf = 0.04;
  const sharpe = vol > 0 ? (mu - rf) / vol : 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const var5 = percentile(sorted, 0.05);
  const tail = sorted.filter((r) => r <= var5);
  const recentVol = stdev(returns.slice(-21));
  const longVol = stdev(returns);
  const ratio = longVol > 0 ? recentVol / longVol : 1;
  const regime: RiskSnapshot["regime"] =
    ratio > 1.45 ? "stress" : ratio > 1.12 ? "elevated" : "calm";
  return {
    last,
    change: prev ? last / prev - 1 : 0,
    vol,
    ewmaVol: ewma,
    sharpe,
    maxDrawdown: maxDrawdown(closes),
    var5,
    cvar5: mean(tail.length ? tail : [var5]),
    rsi: rsi(closes),
    regime,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
  };
}

/** Equal-weight book with Cholesky-correlated Gaussian shocks. */
export function portfolioMonteCarlo(
  seriesList: Series[],
  days = 63,
  paths = 400,
) {
  const n = seriesList.length || 1;
  const lastPrices = seriesList.map((s) => s.bars.at(-1)?.close ?? 0);
  const weight = 1 / n;
  const returns = seriesList.map((s) => logReturns(s.bars.map((b) => b.close)));
  const mus = returns.map((r) => annualizeMean(mean(r)));
  const sigs = returns.map((r) => Math.max(0.05, annualizeVol(stdev(r))));
  const cov: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const daily = i === j ? variance(returns[i]!) : covariance(returns[i]!, returns[j]!);
      cov[i]![j] = daily;
    }
    cov[i]![i] = Math.max(cov[i]![i]!, 1e-10);
  }
  const L = cholesky(cov);
  const rand = mulberry32(42);
  const finals: number[] = [];
  for (let p = 0; p < paths; p++) {
    const s = lastPrices.slice();
    for (let d = 0; d < days; d++) {
      const z = Array.from({ length: n }, () => gaussian(rand));
      const corr = Array.from({ length: n }, (_, i) => {
        let v = 0;
        for (let k = 0; k <= i; k++) v += L[i]![k]! * z[k]!;
        return v;
      });
      for (let i = 0; i < n; i++) {
        const mu = mus[i] ?? 0.08;
        const sigma = sigs[i] ?? 0.2;
        const shock = corr[i]!;
        s[i] = Math.max(
          0.01,
          s[i]! * Math.exp((mu - 0.5 * sigma * sigma) * DT + shock),
        );
      }
    }
    let port = 0;
    for (let i = 0; i < n; i++) port += s[i]! * weight;
    finals.push(port);
  }
  finals.sort((a, b) => a - b);
  const start = lastPrices.reduce((a, b) => a + b * weight, 0);
  return {
    start,
    mean: mean(finals),
    median: percentile(finals, 0.5),
    p05: percentile(finals, 0.05),
    p95: percentile(finals, 0.95),
  };
}
