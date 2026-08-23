import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NexPanel } from "@/components/advisor/nex-panel";
import { DeskLab } from "@/components/desk/lab";
import { NexPortrait, type Mood } from "@/components/nex/nex-portrait";
import { Button } from "@/components/ui/button";
import { loadMarket } from "@/lib/market/api";
import { riskSnapshot } from "@/lib/market/forecast";
import type { Series } from "@/lib/market/types";

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
    <main className="relative min-h-dvh bg-bg">
      <div className="absolute inset-0 lg:right-[min(42vw,28rem)]">
        <NexPortrait mood={mood} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/55 to-transparent px-5 pb-6 pt-24 lg:pb-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-subtle">Research companion</p>
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Nex</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Local chats. Live web and X when you ask. Operator on the desk.
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 z-20 flex gap-2 lg:left-6">
        <Button className="pointer-events-auto" variant="secondary" onClick={() => setDesk((v) => !v)}>
          {desk ? "Close desk" : "Open desk"}
        </Button>
      </div>

      <aside className="relative z-10 flex min-h-dvh flex-col border-border bg-bg/88 backdrop-blur-md lg:fixed lg:right-0 lg:top-0 lg:h-dvh lg:w-[min(42vw,28rem)] lg:border-l">
        <div className="h-[38vh] shrink-0 lg:hidden" />
        <div className="flex min-h-0 flex-1 flex-col border-t border-border lg:border-t-0">
          <NexPanel series={current} risk={risk} onMood={setMood} />
        </div>
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
