export type Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Series = {
  ticker: string;
  name: string;
  currency: string;
  source: "live" | "simulated";
  bars: Bar[];
};

export type Horizon = "21d" | "63d" | "126d" | "189d";

export const HORIZON_DAYS: Record<Horizon, number> = {
  "21d": 21,
  "63d": 63,
  "126d": 126,
  "189d": 189,
};

export const HORIZON_LABEL: Record<Horizon, string> = {
  "21d": "1 month",
  "63d": "3 months",
  "126d": "6 months",
  "189d": "9 months",
};

export type ModelId =
  | "ensemble"
  | "gbm"
  | "garch"
  | "bootstrap"
  | "ar1"
  | "sequence"
  | "regime";

export const MODEL_LABEL: Record<ModelId, string> = {
  ensemble: "Ensemble",
  gbm: "GBM Monte Carlo",
  garch: "GARCH-t",
  bootstrap: "Block bootstrap",
  ar1: "AR(1) on returns",
  sequence: "Sequence net",
  regime: "Markov regime",
};

export type ForecastBand = {
  day: number;
  p05: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
};

export type ForecastResult = {
  model: ModelId;
  last: number;
  mu: number;
  sigma: number;
  bands: ForecastBand[];
  samplePaths: number[][];
  expected: number;
  backtest: {
    mae: number;
    rmse: number;
    directional: number;
    holdout: number;
  };
  note: string;
};

export type RiskSnapshot = {
  last: number;
  change: number;
  vol: number;
  ewmaVol: number;
  sharpe: number;
  maxDrawdown: number;
  var5: number;
  cvar5: number;
  rsi: number;
  regime: "calm" | "elevated" | "stress";
  sma20: number;
  sma50: number;
};
