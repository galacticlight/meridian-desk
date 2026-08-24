import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NexPanel } from "@/components/advisor/nex-panel";
import { DeskLab } from "@/components/desk/lab";
import { NexPortrait, type Mood } from "@/components/nex/nex-portrait";
import { Button } from "@/components/ui/button";
import { loadMarket } from "@/lib/market/api";
import { riskSnapshot } from "@/lib/market/forecast";
import type { Series } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Companion });

function Companion() {
  const [input, setInput] = useState("AAPL, MSFT");
  const [series, setSeries] = useState<Series[]>([]);
  const [note, setNote] = useState("Load a tape when you need the laboratory.");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [desk, setDesk] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");

  const current = series[active];
  const risk = useMemo(() => (current ? riskSnapshot(current) : undefined), [current]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await loadMarket({ data: { tickers: input } });
      setSeries(res.series);
      setActive(0);
      setNote(res.note);
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

  return (
    <main className="min-h-dvh bg-bg lg:grid lg:grid-cols-[minmax(0,1fr)_min(42vw,28rem)]">
      <section className="relative flex h-[48vh] flex-col lg:h-dvh">
        <div className="absolute left-4 top-4 z-20 lg:left-6">
          <Button variant="secondary" onClick={() => setDesk((v) => !v)}>
            {desk ? "Close desk" : "Open desk"}
          </Button>
        </div>
        <NexPortrait mood={mood} className="min-h-0 flex-1" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent px-5 pb-4 pt-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-subtle">Research companion</p>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Nex</h1>
          {current && risk ? (
            <button
              type="button"
              onClick={() => setDesk(true)}
              className="pointer-events-auto mt-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg/70 px-3 py-2 text-left text-xs text-muted"
            >
              <span className="font-mono text-fg">{current.ticker}</span>
              <span className="font-mono tabular-nums">{formatMoney(risk.last)}</span>
              <span className={risk.change >= 0 ? "text-up" : "text-down"}>{formatPct(risk.change)}</span>
              <span className="uppercase tracking-wide">{risk.regime}</span>
            </button>
          ) : null}
        </div>
      </section>

      <aside className="flex min-h-[52vh] flex-col border-t border-border bg-bg/92 lg:h-dvh lg:border-l lg:border-t-0">
        <NexPanel series={current} risk={risk} onMood={setMood} />
      </aside>

      {desk ? (
        <section className="fixed inset-0 z-30 bg-bg/80 backdrop-blur-sm lg:inset-y-4 lg:left-4 lg:right-[calc(min(42vw,28rem)+1rem)]">
          <div className="flex h-full flex-col overflow-hidden rounded-none border border-border bg-bg-elevated lg:rounded-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-subtle">Laboratory</p>
                <p className="font-display text-xl">Meridian Desk</p>
              </div>
              <Button variant="ghost" onClick={() => setDesk(false)}>
                Close
              </Button>
            </div>
            <DeskLab
              series={series}
              input={input}
              setInput={setInput}
              active={active}
              setActive={setActive}
              note={note}
              error={error}
              busy={busy}
              onLoad={() => void load()}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
