import { useEffect, useMemo, useRef, useState } from "react";
import { NexPortrait } from "@/components/nex/nex-portrait";
import { Button } from "@/components/ui/button";
import { askNex, listMacVoices } from "@/lib/advisor/api";
import {
  NEX_GREETING,
  NEX_GREETING_SPOKEN,
  localAdvise,
  spokenFromReply,
  type AdvisorReply,
} from "@/lib/advisor/local-agent";
import { speakNexVoice, stopVoice } from "@/lib/advisor/voice";
import type { RiskSnapshot, Series } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

type Mood = "idle" | "listen" | "speak" | "think";

const STARTERS = [
  "How should I think about asset allocation?",
  "What can this forecast actually tell me?",
  "Explain GARCH versus GBM.",
  "What are SEC fraud red flags?",
];

export function NexPanel({
  series,
  risk,
}: {
  series?: Series;
  risk?: RiskSnapshot;
}) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood>("idle");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [voice, setVoice] = useState(true);
  const [macVoice, setMacVoice] = useState("Samantha");
  const [macVoices, setMacVoices] = useState<{ id: string; name: string }[]>([]);
  const greeted = useRef(false);
  const [thread, setThread] = useState<
    { role: "you" | "nex"; text: string; citations?: AdvisorReply["citations"]; mode?: AdvisorReply["mode"] }[]
  >([
    {
      role: "nex",
      text: NEX_GREETING,
      mode: "local",
    },
  ]);

  const context = useMemo(() => {
    if (!series || !risk) return "No tape loaded.";
    return `${series.ticker} ${series.name} last ${formatMoney(risk.last)} change ${formatPct(risk.change)} vol ${formatPct(risk.vol, 1)} EWMA ${formatPct(risk.ewmaVol, 1)} Sharpe ${risk.sharpe.toFixed(2)} regime ${risk.regime} source ${series.source}`;
  }, [series, risk]);

  async function vocalize(text: string) {
    if (!voice) {
      setMood("idle");
      return;
    }
    setMood("speak");
    await speakNexVoice(spokenFromReply(text), macVoice);
    setMood("idle");
  }

  function greetOnce() {
    if (greeted.current || !voice) return;
    greeted.current = true;
    void vocalize(NEX_GREETING_SPOKEN);
  }

  useEffect(() => {
    void listMacVoices().then((r) => {
      if (!r.voices.length) return;
      setMacVoices(r.voices);
      const preferred = r.voices.find((v) => v.id === "Samantha") ?? r.voices[0];
      if (preferred) setMacVoice(preferred.id);
    });
  }, []);

  useEffect(() => {
    if (!voice) return;
    const onPointer = () => greetOnce();
    window.addEventListener("pointerdown", onPointer, { once: true });
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [voice]);

  useEffect(() => {
    if (!voice) stopVoice();
  }, [voice]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setQuery("");
    setThread((t) => [...t, { role: "you", text: q }]);
    setBusy(true);
    setMood("think");
    const local = localAdvise(q, series, risk);
    let reply: AdvisorReply = local;
    if (live) {
      try {
        const remote = await askNex({ data: { query: q, context } });
        if (remote.ok) {
          reply = { text: remote.text, citations: remote.citations, mode: "grok" };
        }
      } catch {
        reply = local;
      }
    }
    setThread((t) => [...t, { role: "nex", ...reply }]);
    setBusy(false);
    await vocalize(reply.text);
  }

  return (
    <aside className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <div className="relative h-44 w-full shrink-0 overflow-hidden sm:h-52">
        <NexPortrait mood={mood} className="h-full w-full rounded-none" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-elevated to-transparent px-4 pb-3 pt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-xl leading-none">Nex</p>
              <p className="mt-1 text-xs text-muted">
                {busy ? "Consulting the library" : "Research companion · Operator"}
              </p>
            </div>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-subtle">
              {mood === "speak" ? "speaking" : mood === "think" ? "thinking" : "on desk"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <p className="text-[11px] uppercase tracking-wide text-subtle">
          {live ? "Live model when available" : "Offline library"}
        </p>
        <div className="flex items-center gap-1.5">
          {macVoices.length ? (
            <select
              value={macVoice}
              onChange={(e) => setMacVoice(e.target.value)}
              className="h-8 max-w-[7.5rem] rounded-full border border-border bg-bg px-2 text-[11px] text-muted"
              aria-label="Nex voice"
            >
              {macVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const next = !voice;
              setVoice(next);
              if (!next) stopVoice();
            }}
            className="h-8 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
          >
            {voice ? "Voice on" : "Voice off"}
          </button>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className="h-8 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
          >
            {live ? "Use local only" : "Allow live model"}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.map((m, i) => (
          <div key={i} className={m.role === "you" ? "ml-6" : "mr-2"}>
            <p className="text-[10px] uppercase tracking-wide text-subtle">
              {m.role === "you" ? "Operator" : m.mode === "grok" ? "Nex · live model" : "Nex · local"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{m.text}</p>
            {m.citations?.length ? (
              <ul className="mt-2 space-y-1">
                {m.citations.map((c) => (
                  <li key={c.url + c.title}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted underline decoration-border-strong underline-offset-2 hover:text-fg"
                    >
                      {c.source}: {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="min-h-8 rounded-full border border-border px-2.5 py-1 text-left text-[11px] text-muted hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setMood("listen");
            }}
            placeholder="Ask Nex, Operator"
            className="h-11 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none"
            suppressHydrationWarning
          />
          <Button type="submit" size="md" disabled={busy}>
            Ask
          </Button>
        </form>
      </div>
    </aside>
  );
}
