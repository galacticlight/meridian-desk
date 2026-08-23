import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NexPanel } from "@/components/advisor/nex-panel";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { PriceChart } from "@/components/charts/price-chart";
import { Stat } from "@/components/desk/stat";
import { Button } from "@/components/ui/button";
import { SOURCES } from "@/lib/advisor/corpus";
import { loadMarket } from "@/lib/market/api";
import { portfolioMonteCarlo, riskSnapshot, runForecast } from "@/lib/market/forecast";
import type { Horizon, ModelId, Series } from "@/lib/market/types";
import { HORIZON_LABEL, MODEL_LABEL } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Desk });

const MODELS: ModelId[] = ["ensemble", "gbm", "garch", "bootstrap", "ar1", "sequence", "regime"];
const HORIZONS: Horizon[] = ["21d", "63d", "126d", "189d"];

function Desk() {
  const [input, setInput] = useState("AAPL, MSFT");
  const [series, setSeries] = useState<Series[]>([]);
  const [note, setNote] = useState("Load a tape to begin.");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<ModelId>("ensemble");
  const [horizon, setHorizon] = useState<Horizon>("63d");
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"tape" | "forecast" | "portfolio" | "methods">("tape");
  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  const current = series[active];
  const risk = useMemo(() => (current ? riskSnapshot(current) : undefined), [current]);
  const forecast = useMemo(
    () => (current ? runForecast(current, model, horizon) : undefined),
    [current, model, horizon],
  );
  const book = useMemo(() => (series.length > 1 ? portfolioMonteCarlo(series, 63, 360) : null), [series]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await loadMarket({ data: { tickers: input } });
      setSeries(res.series);
      setActive(0);
      setNote(res.note);
      setTab("tape");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the tape.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (booted) return;
    setBooted(true);
    void load();
  }, [booted]);

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ series, model, horizon, forecast, risk, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meridian-${current?.ticker ?? "desk"}.json`;
    a.click();
  }

  return (
    <main className="grid-wash min-h-dvh">
      <header className="border-b border-border bg-bg/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <img
              src="/nex/portrait.jpg"
              alt=""
              className="mt-0.5 hidden h-11 w-9 rounded-md object-cover object-top sm:block"
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-subtle">Private laboratory</p>
              <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Meridian Desk</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                Forecasts, risk cones, and Nex — an offline research companion. Nothing leaves this session unless you
                ask.
              </p>
            </div>
          </div>
          <form
            className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label className="sr-only" htmlFor="tickers">
              Tickers
            </label>
            <input
              id="tickers"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="AAPL, MSFT, SPY"
              className="h-12 min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-4 font-mono text-sm uppercase tracking-wide text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none lg:w-72"
            />
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Loading" : "Load tape"}
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {series.map((s, i) => (
              <button
                key={s.ticker}
                type="button"
                onClick={() => setActive(i)}
                className={`h-11 rounded-full border px-4 text-sm ${
                  i === active ? "border-accent bg-accent text-accent-fg" : "border-border text-muted hover:text-fg"
                }`}
              >
                {s.ticker}
              </button>
            ))}
            {current ? (
              <span className="ml-auto text-xs text-subtle">
                {current.source === "live" ? "Live daily bars" : "Calibrated synthetic tape"} · {current.name}
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-md border border-down/40 bg-bg-elevated px-4 py-3 text-sm text-down">{error}</p>
          ) : null}

          {current && risk && forecast ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Last" value={formatMoney(risk.last)} hint={current.currency} />
                <Stat label="Session" value={formatPct(risk.change)} tone={risk.change >= 0 ? "up" : "down"} />
                <Stat label="Realized vol" value={formatPct(risk.vol, 1)} hint="annualized" />
                <Stat label="EWMA vol" value={formatPct(risk.ewmaVol, 1)} hint="λ 0.94" />
                <Stat
                  label="Regime"
                  value={risk.regime}
                  tone={risk.regime === "stress" ? "down" : risk.regime === "elevated" ? "warn" : "up"}
                />
                <Stat label="Sharpe" value={risk.sharpe.toFixed(2)} hint="vs 4% cash" />
                <Stat label="Max drawdown" value={formatPct(risk.maxDrawdown, 1)} tone="down" />
                <Stat label="Daily VaR 5%" value={formatPct(risk.var5)} />
              </div>

              <div className="rounded-xl border border-border bg-bg-elevated p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["tape", "Tape"],
                      ["forecast", "Forecast cone"],
                      ["portfolio", "Book"],
                      ["methods", "Methods"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`h-11 rounded-sm px-3 text-sm ${
                        tab === id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={exportJson}>
                    Export JSON
                  </Button>
                </div>

                {tab === "tape" ? <PriceChart bars={current.bars} /> : null}
                {tab === "forecast" ? (
                  <div>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {MODELS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={`h-10 rounded-full border px-3 text-xs ${
                              model === m ? "border-accent bg-bg-subtle text-fg" : "border-border text-muted"
                            }`}
                          >
                            {MODEL_LABEL[m]}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {HORIZONS.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHorizon(h)}
                            className={`h-10 rounded-full border px-3 text-xs ${
                              horizon === h ? "border-accent bg-bg-subtle text-fg" : "border-border text-muted"
                            }`}
                          >
                            {HORIZON_LABEL[h]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ForecastChart forecast={forecast} />
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-subtle">Median terminal</dt>
                        <dd className="font-mono tabular-nums">{formatMoney(forecast.expected)}</dd>
                      </div>
                      <div>
                        <dt className="text-subtle">Drift μ</dt>
                        <dd className="font-mono tabular-nums">{formatPct(forecast.mu, 1)}</dd>
                      </div>
                      <div>
                        <dt className="text-subtle">Vol σ</dt>
                        <dd className="font-mono tabular-nums">{formatPct(forecast.sigma, 1)}</dd>
                      </div>
                      <div>
                        <dt className="text-subtle">Walk-forward dir.</dt>
                        <dd className="font-mono tabular-nums">{forecast.backtest.directional.toFixed(0)}%</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs leading-relaxed text-muted">{forecast.note}</p>
                  </div>
                ) : null}
                {tab === "portfolio" ? (
                  <div className="px-1 py-4">
                    {book ? (
                      <>
                        <h2 className="font-display text-2xl">Equal-weight book</h2>
                        <p className="mt-1 max-w-xl text-sm text-muted">
                          Correlated Monte Carlo via Cholesky of overlapping log-return covariance. Equal weights, 63
                          trading days. Diversification benefit is no longer assumed away.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Stat label="Now" value={formatMoney(book.start)} />
                          <Stat label="Mean" value={formatMoney(book.mean)} />
                          <Stat label="5th" value={formatMoney(book.p05)} tone="down" />
                          <Stat label="95th" value={formatMoney(book.p95)} tone="up" />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted">Load two or more names to simulate a book.</p>
                    )}
                  </div>
                ) : null}
                {tab === "methods" ? (
                  <div className="space-y-4 px-1 py-3 text-sm leading-relaxed text-muted">
                    <h2 className="font-display text-2xl text-fg">On-device engine</h2>
                    <p>
                      Literature in 2025–2026 still favors ensembles over any single net. Directional stock prediction
                      remains close to chance out of sample. Meridian therefore reports a cone, not a call.
                    </p>
                    <ul className="space-y-2">
                      <li>
                        <span className="text-fg">GBM</span> — closed-form geometric Brownian motion with historically
                        estimated drift and volatility.
                      </li>
                      <li>
                        <span className="text-fg">GARCH-t</span> — variance targeting GARCH(1,1) with Student-t(6)
                        shocks for clustered vol and fat tails.
                      </li>
                      <li>
                        <span className="text-fg">Block bootstrap</span> — resampled historical log-return blocks so
                        serial dependence is not erased.
                      </li>
                      <li>
                        <span className="text-fg">AR(1)</span> — mean-reverting returns plus residual Gaussian noise.
                      </li>
                      <li>
                        <span className="text-fg">Sequence net</span> — a small Elman recurrent net trained on this
                        tape, on-device.
                      </li>
                      <li>
                        <span className="text-fg">Markov regime</span> — two-state calm/stress volatility feeding GBM.
                      </li>
                      <li>
                        <span className="text-fg">Ensemble</span> — median blend of GBM, GARCH-t, bootstrap, and AR(1).
                      </li>
                    </ul>
                    <p>
                      Walk-forward holdout is the last 20% of the tape. EWMA volatility uses RiskMetrics λ = 0.94.
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-bg-elevated px-5 py-16 text-center">
              <p className="font-display text-2xl">The tape is empty</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Load one or more symbols. If the public feed is blocked, Meridian draws a calibrated synthetic path so
                the laboratory still runs offline.
              </p>
              <p className="mt-6 text-xs text-subtle">{note}</p>
            </div>
          )}

          <footer className="space-y-3 pb-10 text-xs leading-relaxed text-subtle">
            <p>
              Library —{" "}
              {SOURCES.map((s, i) => (
                <span key={s.id}>
                  {i > 0 ? ", " : null}
                  <a className="underline decoration-border-strong" href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </span>
              ))}
              .
            </p>
            <p>Educational research only. Not an offer, solicitation, or personalized investment advice.</p>
          </footer>
        </section>

        <div className="lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]">
          <NexPanel series={current} risk={risk} />
        </div>
      </div>
    </main>
  );
}
