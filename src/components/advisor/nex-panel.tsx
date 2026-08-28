import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { askNex, getWeather, listMacVoices, nexLive } from "@/lib/advisor/api";
import {
  NEX_GREETING,
  NEX_GREETING_SPOKEN,
  canonicalReply,
  localAdvise,
  spokenFromReply,
  type AdvisorReply,
} from "@/lib/advisor/local-agent";
import {
  formatMemoryBlock,
  ingestOperatorUtterance,
  loadMemory,
  saveMemory,
  createMemory,
  type OperatorMemory,
} from "@/lib/advisor/memory";
import { clockReply, followUps, isTapeQuery, isTimeQuery, tapeReply } from "@/lib/advisor/skills";
import { playTokens } from "@/lib/advisor/stream";
import { speakNexVoice, stopVoice } from "@/lib/advisor/voice";
import { isLiveQuery, isWeatherQuery } from "@/lib/advisor/weather";
import type { Mood } from "@/components/nex/nex-portrait";
import type { RiskSnapshot, Series } from "@/lib/market/types";
import { formatMoney, formatPct } from "@/lib/utils";

const STARTERS = [
  "Brief me on the tape.",
  "What's the weather in Seattle?",
  "Who are you?",
  "How should I think about asset allocation?",
];

const THREAD_KEY = "nex-thread-v2";

type Recog = {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

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
  onCaption,
}: {
  series?: Series;
  risk?: RiskSnapshot;
  onMood?: (mood: Mood) => void;
  onCaption?: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood>("idle");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(true);
  const [macVoice, setMacVoice] = useState("Samantha");
  const [macVoices, setMacVoices] = useState<{ id: string; name: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [liveMind, setLiveMind] = useState(false);
  const [memory, setMemory] = useState<OperatorMemory>(() => createMemory());
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
    setMemory(loadMemory());
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

  useEffect(() => {
    void nexLive().then((r) => setLiveMind(r.live)).catch(() => setLiveMind(false));
    void listMacVoices().then((r) => {
      if (!r.voices.length) return;
      setMacVoices(r.voices);
      const preferred = r.voices.find((v) => v.id === "Samantha") ?? r.voices[0];
      if (preferred) setMacVoice(preferred.id);
    });
  }, []);

  async function vocalize(text: string) {
    onCaption?.(spokenFromReply(text));
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
    onCaption?.(NEX_GREETING_SPOKEN);
    void vocalize(NEX_GREETING_SPOKEN);
  }

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
    const nextMem = ingestOperatorUtterance(memory, q);
    setMemory(nextMem);
    saveMemory(nextMem);
    setThread((t) => [...t, { role: "you", text: q }]);
    setBusy(true);
    moodTo("think");
    let reply: AdvisorReply =
      canonicalReply(q) ??
      (isTimeQuery(q) ? clockReply() : isTapeQuery(q) ? tapeReply(series, risk) : localAdvise(q, series, risk, nextMem));
    try {
      if (isWeatherQuery(q)) {
        const wx = await getWeather({ data: { query: q } });
        if (wx.ok) reply = { text: wx.text, citations: wx.citations, mode: wx.mode };
      } else if (!canonicalReply(q) && !isTimeQuery(q) && !isTapeQuery(q) && (liveMind || isLiveQuery(q))) {
        const remote = await askNex({
          data: {
            query: q,
            context,
            research: isLiveQuery(q),
            history: thread.slice(-8),
            memory: formatMemoryBlock(nextMem),
          },
        });
        if (remote.ok) {
          reply = {
            text: remote.text,
            citations: remote.citations,
            mode: remote.mode ?? "grok",
          };
        }
      }
    } catch {
      /* local already set */
    }
    setThread((t) => [...t, { role: "nex", text: "", mode: reply.mode, citations: reply.citations }]);
    await playTokens(reply.text, (soFar) => {
      setThread((t) => {
        const copy = [...t];
        const last = copy.at(-1);
        if (last?.role === "nex") copy[copy.length - 1] = { ...last, text: soFar };
        return copy;
      });
      onCaption?.(spokenFromReply(soFar));
    });
    setBusy(false);
    await vocalize(reply.text);
  }

  function listen() {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recog;
      webkitSpeechRecognition?: new () => Recog;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onstart = () => {
      setListening(true);
      moodTo("listen");
    };
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript;
      if (t) void submit(t);
    };
    rec.onerror = () => {
      setListening(false);
      moodTo("idle");
    };
    rec.onend = () => setListening(false);
    rec.start();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
        <p className="mr-auto text-[11px] uppercase tracking-wide text-subtle">
          {busy ? "Working" : liveMind ? "Live mind" : "Local precepts"}
        </p>
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
              {m.role === "you" ? "Operator" : m.mode === "research" ? "Nex · live" : m.mode === "grok" ? "Nex · live mind" : "Nex"}
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
          {(thread.at(-1)?.role === "nex" && thread.length > 1
            ? followUps(thread.at(-2)?.text ?? "", series)
            : STARTERS
          ).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="min-h-11 rounded-full border border-border px-3 py-1 text-left text-[11px] text-muted hover:text-fg"
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
            placeholder="Speak, Operator…"
            className="h-12 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:border-border-strong focus:outline-none"
            suppressHydrationWarning
          />
          <Button type="button" variant="secondary" size="lg" onClick={listen} disabled={busy}>
            {listening ? "Listening" : "Speak"}
          </Button>
          <Button type="submit" size="lg" disabled={busy}>
            Transmit
          </Button>
        </form>
      </div>
    </div>
  );
}
