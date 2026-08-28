import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NexPanel } from "@/components/advisor/nex-panel";
import { DeskLab } from "@/components/desk/lab";
import { TapeHud } from "@/components/desk/tape-hud";
import { NexPortrait, type Mood } from "@/components/nex/nex-portrait";
import { loadMemory, rememberTickers, saveMemory } from "@/lib/advisor/memory";
import { loadMarket } from "@/lib/market/api";
import { riskSnapshot } from "@/lib/market/forecast";
import type { Series } from "@/lib/market/types";
import { formatMoney } from "@/lib/utils";

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
            ? `Tape loaded. ${s.ticker} last ${formatMoney(last)}. The cone is not a call.`
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
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(14rem,38vh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_min(38vw,26rem)] lg:grid-rows-1">
        <section className="relative min-h-0">
          <NexPortrait mood={mood} caption={caption} className="h-full" />
        </section>
        <aside className="flex min-h-0 flex-col border-t border-border bg-bg/95 lg:border-l lg:border-t-0">
          <NexPanel series={current} risk={risk} onMood={setMood} onCaption={setCaption} />
        </aside>
      </div>

      <TapeHud
        input={input}
        setInput={setInput}
        series={series}
        current={current}
        risk={risk}
        busy={busy}
        error={error}
        desk={desk}
        onLoad={(t) => void load(t ?? input)}
        onToggleDesk={() => setDesk((v) => !v)}
      />
      {desk ? (
        <div className="max-h-[46vh] border-t border-border">
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
    </main>
  );
}
