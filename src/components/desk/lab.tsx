import { useMemo, useState } from "react";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { PriceChart } from "@/components/charts/price-chart";
import { Stat } from "@/components/desk/stat";
import { Button } from "@/components/ui/button";
import { SOURCES } from "@/lib/advisor/corpus";
import { portfolioMonteCarlo, riskSnapshot, runForecast } from "@/lib/market/forecast";
import type { Horizon, ModelId, Series } from "@/lib/market/types";
import { HORIZON_LABEL, MODEL_LABEL } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

const MODELS: ModelId[] = ["ensemble", "gbm", "garch", "bootstrap", "ar1", "sequence", "regime"];
const HORIZONS: Horizon[] = ["21d", "63d", "126d", "189d"];

export function DeskLab({
  series,
  input,
  setInput,
  active,
  setActive,
  note,
  error,
  busy,
  onLoad,
}: {
  series: Series[];
  input: string;
  setInput: (v: string) => void;
  active: number;
  setActive: (i: number) => void;
  note: string;
  error: string | null;
  busy: boolean;
  onLoad: () => void;
}) {
  const [model, setModel] = useState<ModelId>("ensemble");
  const [horizon, setHorizon] = useState<Horizon>("63d");
  const [tab, setTab] = useState<"tape" | "forecast" | "portfolio" | "methods">("tape");
  const current = series[active];
  const risk = useMemo(() => (current ? riskSnapshot(current) : undefined), [current]);
  const forecast = useMemo(
    () => (current ? runForecast(current, model, horizon) : undefined),
    [current, model, horizon],
  );
  const book = useMemo(() => (series.length > 1 ? portfolioMonteCarlo(series, 63, 360) : null), [series]);

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
    <div className="flex h-full min-h-0 flex-col">
      <form
        className="flex gap-2 border-b border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          onLoad();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AAPL, MSFT, SPY"
          className="h-11 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 font-mono text-sm uppercase text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Loading" : "Load"}
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {series.map((s, i) => (
            <button
              key={s.ticker}
              type="button"
              onClick={() => setActive(i)}
              className={`h-10 rounded-full border px-3 text-sm ${
                i === active ? "border-accent bg-accent text-accent-fg" : "border-border text-muted hover:text-fg"
              }`}
            >
              {s.ticker}
            </button>
          ))}
        </div>
        {error ? <p className="mb-3 text-sm text-down">{error}</p> : null}
        {current && risk && forecast ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Last" value={formatMoney(risk.last)} hint={current.currency} />
              <Stat label="Session" value={formatPct(risk.change)} tone={risk.change >= 0 ? "up" : "down"} />
              <Stat label="Realized vol" value={formatPct(risk.vol, 1)} />
              <Stat label="Regime" value={risk.regime} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["tape", "Tape"],
                  ["forecast", "Forecast"],
                  ["portfolio", "Book"],
                  ["methods", "Methods"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`h-10 rounded-sm px-3 text-sm ${tab === id ? "bg-accent text-accent-fg" : "text-muted"}`}
                >
                  {label}
                </button>
              ))}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={exportJson}>
                Export
              </Button>
            </div>
            <div className="mt-3">
              {tab === "tape" ? <PriceChart bars={current.bars} /> : null}
              {tab === "forecast" ? (
                <div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {MODELS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={`h-9 rounded-full border px-3 text-xs ${
                          model === m ? "border-accent text-fg" : "border-border text-muted"
                        }`}
                      >
                        {MODEL_LABEL[m]}
                      </button>
                    ))}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {HORIZONS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorizon(h)}
                        className={`h-9 rounded-full border px-3 text-xs ${
                          horizon === h ? "border-accent text-fg" : "border-border text-muted"
                        }`}
                      >
                        {HORIZON_LABEL[h]}
                      </button>
                    ))}
                  </div>
                  <ForecastChart forecast={forecast} />
                  <p className="mt-2 text-xs text-muted">{forecast.note}</p>
                </div>
              ) : null}
              {tab === "portfolio" ? (
                book ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Now" value={formatMoney(book.start)} />
                    <Stat label="Mean" value={formatMoney(book.mean)} />
                    <Stat label="5th" value={formatMoney(book.p05)} tone="down" />
                    <Stat label="95th" value={formatMoney(book.p95)} tone="up" />
                  </div>
                ) : (
                  <p className="text-sm text-muted">Load two names for a book.</p>
                )
              ) : null}
              {tab === "methods" ? (
                <p className="text-sm leading-relaxed text-muted">
                  Ensemble of GBM, GARCH-t, block bootstrap, and AR(1). Cones, not calls. Walk-forward is the last 20%
                  of the tape.
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="py-10 text-sm text-muted">{note}</p>
        )}
        <p className="mt-6 text-[11px] text-subtle">
          {SOURCES.map((s) => s.label).join(" · ")}. Education only.
        </p>
      </div>
    </div>
  );
}
