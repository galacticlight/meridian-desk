import { useEffect, useMemo, useState } from "react";
import { Sparkline } from "@/components/desk/sparkline";
import { Button } from "@/components/ui/button";
import { searchSymbols } from "@/lib/market/api";
import { runForecast } from "@/lib/market/forecast";
import type { RiskSnapshot, Series } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

const WATCH = ["AAPL", "MSFT", "SEV", "SPY"];

export function TapeHud({
  input,
  setInput,
  series,
  current,
  risk,
  busy,
  error,
  desk,
  onLoad,
  onToggleDesk,
}: {
  input: string;
  setInput: (v: string) => void;
  series: Series[];
  current?: Series;
  risk?: RiskSnapshot;
  busy: boolean;
  error: string | null;
  desk: boolean;
  onLoad: (tickers?: string) => void;
  onToggleDesk: () => void;
}) {
  const [hits, setHits] = useState<{ symbol: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const spark = useMemo(() => current?.bars.slice(-60).map((b) => b.close) ?? [], [current]);
  const cone = useMemo(() => {
    if (!current) return null;
    const f = runForecast(current, "ensemble", "63d");
    const last = f.bands.at(-1);
    if (!last) return null;
    return { lo: last.p25, hi: last.p75 };
  }, [current]);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchSymbols({ data: { q } })
        .then((r) => setHits(r.hits))
        .catch(() => setHits([]));
    }, 180);
    return () => window.clearTimeout(t);
  }, [input]);

  function pick(symbol: string) {
    setInput(symbol);
    setOpen(false);
    onLoad(symbol);
  }

  return (
    <footer className="relative border-t border-border bg-bg-elevated">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <form
          className="relative min-w-0 flex-1 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            onLoad();
          }}
        >
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Ticker or name"
            className="h-11 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none"
            aria-autocomplete="list"
            aria-expanded={open && hits.length > 0}
          />
          {open && hits.length ? (
            <ul className="absolute bottom-full z-20 mb-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-bg-elevated py-1 shadow-soft">
              {hits.map((h) => (
                <li key={h.symbol}>
                  <button
                    type="button"
                    className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-bg-subtle"
                    onClick={() => pick(h.symbol)}
                  >
                    <span className="font-mono text-fg">{h.symbol}</span>
                    <span className="truncate text-xs text-muted">{h.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
        <Button type="button" disabled={busy} onClick={() => onLoad()}>
          {busy ? "Loading" : "Load"}
        </Button>
        <div className="hidden gap-1 sm:flex">
          {WATCH.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => pick(w)}
              className="h-9 rounded-full border border-border px-2.5 font-mono text-[11px] text-muted hover:text-fg"
            >
              {w}
            </button>
          ))}
        </div>
        {current && risk ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 font-mono text-xs tabular-nums text-muted">
            <span className="text-fg">{current.ticker}</span>
            <span>{formatMoney(risk.last)}</span>
            <span className={risk.change >= 0 ? "text-up" : "text-down"}>{formatPct(risk.change)}</span>
            <Sparkline values={spark} className="h-4 w-20" />
            <span className="uppercase tracking-wide">{risk.regime}</span>
            {cone ? (
              <span className="hidden text-subtle lg:inline">
                3m cone {formatMoney(cone.lo)}–{formatMoney(cone.hi)}
              </span>
            ) : null}
            {series.length > 1 ? <span>{series.length} names</span> : null}
          </div>
        ) : (
          <p className="text-xs text-subtle">Search a name. Nex will keep the desk.</p>
        )}
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onLoad()}>
          Refresh
        </Button>
        <Button variant="secondary" onClick={onToggleDesk}>
          {desk ? "Hide lab" : "Lab"}
        </Button>
      </div>
      {error ? <p className="px-4 pb-2 text-sm text-down">{error}</p> : null}
    </footer>
  );
}
