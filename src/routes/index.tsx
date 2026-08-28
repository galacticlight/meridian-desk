import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NexPanel } from "@/components/advisor/nex-panel";
import { DeskLab } from "@/components/desk/lab";
import { NexPortrait, type Mood } from "@/components/nex/nex-portrait";
import { Button } from "@/components/ui/button";
import { loadMemory, rememberTickers, saveMemory } from "@/lib/advisor/memory";
import { loadMarket } from "@/lib/market/api";
import { riskSnapshot } from "@/lib/market/forecast";
import type { Series } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Habitat });

function Habitat() {
  const [input, setInput] = useState("AAPL");
  const [series, setSeries] = useState<Series[]>([]);
  const [note, setNote] = useState("Load a live tape.");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [desk, setDesk] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [caption, setCaption] = useState("");

  const current = series[active];
  const risk = useMemo(() => (current ? riskSnapshot(current) : undefined), [current]);

  async function load(tickers = input) {
    setBusy(true);
    setError(null);
    try {
      const res = await loadMarket({ data: { tickers } });
      setSeries(res.series);
      setActive(0);
      setNote(res.note);
      setError(res.series.length ? null : res.note);
      const mem = rememberTickers(loadMemory(), tickers);
      saveMemory(mem);
      if (res.series[0]) {
        const s = res.series[0];
        const last = s.bars.at(-1)?.close;
        setCaption(
          last != null
            ? `Tape loaded. ${s.ticker} last ${formatMoney(last)}. Live Nasdaq. The cone is not a call.`
            : `Tape loaded. ${s.ticker}.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the tape.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = loadMemory().lastTickers || "AAPL";
    setInput(saved);
    void load(saved);
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-bg">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_min(38vw,26rem)]">
        <section className="relative hidden min-h-0 lg:block">
          <NexPortrait mood={mood} caption={caption} className="h-full" />
        </section>
        <aside className="flex min-h-0 flex-col border-border bg-bg/95 lg:border-l">
          <div className="h-44 shrink-0 overflow-hidden lg:hidden">
            <NexPortrait mood={mood} caption={caption} className="h-full" />
          </div>
          <NexPanel series={current} risk={risk} onMood={setMood} onCaption={setCaption} />
        </aside>
      </div>

      <footer className="border-t border-border bg-bg-elevated">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="SEV, Aptera, AAPL"
              className="h-11 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none sm:max-w-xs"
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Loading" : "Load tape"}
            </Button>
          </form>
          {current && risk ? (
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums text-muted">
              <span className="text-fg">{current.ticker}</span>
              <span>{formatMoney(risk.last)}</span>
              <span className={risk.change >= 0 ? "text-up" : "text-down"}>{formatPct(risk.change)}</span>
              <span className="uppercase tracking-wide">{risk.regime}</span>
              <span>{current.source === "live" ? "Live Nasdaq" : "Simulated"}</span>
            </div>
          ) : (
            <p className="text-xs text-subtle">{note}</p>
          )}
          <Button variant="secondary" onClick={() => setDesk((v) => !v)}>
            {desk ? "Hide lab" : "Show lab"}
          </Button>
        </div>
        {error ? <p className="px-4 pb-2 text-sm text-down">{error}</p> : null}
        {desk ? (
          <div className="max-h-[52vh] border-t border-border">
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
              compact
            />
          </div>
        ) : null}
      </footer>
    </main>
  );
}
