import { useEffect, useMemo, useRef, useState } from "react";
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
import type { Mood } from "@/components/nex/nex-portrait";
import type { RiskSnapshot, Series } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

const STARTERS = [
  "Who are you?",
  "How should I think about asset allocation?",
  "Research what volatility is doing this week.",
  "What can this forecast actually tell me?",
];

const THREAD_KEY = "nex-thread-v1";

type Turn = {
  role: "you" | "nex";
  text: string;
  citations?: AdvisorReply["citations"];
  mode?: AdvisorReply["mode"];
};

export function NexPanel({
  series,
  risk,
  onMood,
}: {
  series?: Series;
  risk?: RiskSnapshot;
  onMood?: (mood: Mood) => void;
}) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood>("idle");
  const [busy, setBusy] = useState(false);
  const [research, setResearch] = useState(false);
  const [voice, setVoice] = useState(true);
  const [macVoice, setMacVoice] = useState("Samantha");
  const [macVoices, setMacVoices] = useState<{ id: string; name: string }[]>([]);
  const greeted = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [thread, setThread] = useState<Turn[]>([{ role: "nex", text: NEX_GREETING, mode: "local" }]);

  function moodTo(next: Mood) {
    setMood(next);
    onMood?.(next);
  }

  const context = useMemo(() => {
    if (!series || !risk) return "No tape loaded.";
    return `${series.ticker} ${series.name} last ${formatMoney(risk.last)} change ${formatPct(risk.change)} vol ${formatPct(risk.vol, 1)} EWMA ${formatPct(risk.ewmaVol, 1)} Sharpe ${risk.sharpe.toFixed(2)} regime ${risk.regime} source ${series.source}`;
  }, [series, risk]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(THREAD_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Turn[];
      if (Array.isArray(parsed) && parsed.length) setThread(parsed);
    } catch {
      /* keep greeting */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THREAD_KEY, JSON.stringify(thread.slice(-40)));
    } catch {
      /* quota */
    }
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [thread]);

  async function vocalize(text: string) {
    if (!voice) {
      moodTo("idle");
      return;
    }
    moodTo("speak");
    await speakNexVoice(spokenFromReply(text), macVoice);
    moodTo("idle");
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
    moodTo("think");
    const local = localAdvise(q, series, risk);
    let reply: AdvisorReply = local;
    if (research) {
      try {
        const remote = await askNex({
          data: {
            query: q,
            context,
            research: true,
            history: thread.slice(-8),
          },
        });
        if (remote.ok) {
          reply = {
            text: remote.text,
            citations: remote.citations,
            mode: remote.mode ?? "research",
          };
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="font-display text-2xl leading-none">Nex</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-subtle">
            {busy ? "Working" : research ? "Live research · web + X" : "Local companion"}
          </p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wide text-subtle">
          {mood === "speak" ? "speaking" : mood === "think" ? "thinking" : mood === "listen" ? "listening" : "on desk"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
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
          onClick={() => setResearch((v) => !v)}
          className="h-8 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
        >
          {research ? "Local only" : "Live research"}
        </button>
        <button
          type="button"
          onClick={() => {
            setThread([{ role: "nex", text: NEX_GREETING, mode: "local" }]);
            localStorage.removeItem(THREAD_KEY);
          }}
          className="h-8 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
        >
          New chat
        </button>
      </div>

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {thread.map((m, i) => (
          <div key={i} className={m.role === "you" ? "ml-8" : "mr-2"}>
            <p className="text-[10px] uppercase tracking-wide text-subtle">
              {m.role === "you"
                ? "Operator"
                : m.mode === "research"
                  ? "Nex · web + X"
                  : m.mode === "grok"
                    ? "Nex · live model"
                    : "Nex · local"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-fg/92">{m.text}</p>
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
              if (e.target.value) moodTo("listen");
            }}
            placeholder="Talk with Nex, Operator"
            className="h-12 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none"
            suppressHydrationWarning
          />
          <Button type="submit" size="lg" disabled={busy}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
