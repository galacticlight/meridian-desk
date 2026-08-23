import { speakMac } from "./api";

let currentAudio: HTMLAudioElement | null = null;
let speechLevel = 0;
const levelListeners = new Set<(n: number) => void>();
let envelopeTimer = 0;
let resumeTimer = 0;

function setSpeechLevel(n: number) {
  speechLevel = Math.max(0, Math.min(1, n));
  for (const fn of levelListeners) fn(speechLevel);
}

export function getSpeechLevel() {
  return speechLevel;
}

export function subscribeSpeechLevel(fn: (n: number) => void) {
  levelListeners.add(fn);
  fn(speechLevel);
  return () => {
    levelListeners.delete(fn);
  };
}

function startEnvelope() {
  stopEnvelope();
  const tick = () => {
    const burst = Math.random() < 0.18 ? 0.45 + Math.random() * 0.4 : 0.06 + Math.random() * 0.18;
    setSpeechLevel(burst);
    envelopeTimer = window.setTimeout(tick, 90 + Math.random() * 110);
  };
  tick();
}

function stopEnvelope() {
  if (envelopeTimer) {
    window.clearTimeout(envelopeTimer);
    envelopeTimer = 0;
  }
  setSpeechLevel(0);
}

export function stopVoice() {
  stopEnvelope();
  if (resumeTimer) {
    window.clearInterval(resumeTimer);
    resumeTimer = 0;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

function scoreVoice(v: SpeechSynthesisVoice) {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let s = 0;
  if (/google|microsoft|android/.test(n)) s -= 100;
  if (lang.startsWith("en")) s += 12;
  if (/en-us|en_us|en-gb|en-au|en-ie/.test(lang)) s += 6;
  if (/samantha|nicky|ava|allison|zoe|karen|moira|serena|tessa|fiona/.test(n)) s += 50;
  if (/enhanced|premium|natural|siri|neural/.test(n)) s += 20;
  if (/\balex\b|\bdaniel\b/.test(n)) s += 6;
  if (/compact|novelty|whisper|zarvox|trinoids|bells|boing|bubbles|cellos|bad news|good news|albert|bahh|pipe|organ/.test(n)) {
    s -= 80;
  }
  if (v.localService) s += 14;
  return s;
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  const best = ranked[0];
  return best && scoreVoice(best) > 0 ? best : undefined;
}

function readyVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const finish = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 500);
  });
}

export async function speakLocal(text: string): Promise<void> {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken || typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  stopVoice();
  await new Promise((r) => window.setTimeout(r, 40));
  const voices = await readyVoices();
  const voice = pickVoice(voices);
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.rate = 0.94;
    utter.pitch = 0.92;
    if (voice) utter.voice = voice;
    startEnvelope();
    resumeTimer = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) return;
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 8000);
    const done = () => {
      if (resumeTimer) {
        window.clearInterval(resumeTimer);
        resumeTimer = 0;
      }
      stopEnvelope();
      resolve();
    };
    utter.onend = done;
    utter.onerror = done;
    window.speechSynthesis.speak(utter);
    window.speechSynthesis.resume();
  });
}

export function playAudioBytes(base64: string, mime = "audio/mpeg"): Promise<void> {
  stopVoice();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  let ctx: AudioContext | null = null;
  let raf = 0;
  const finish = (urlToRevoke: string, resolve: () => void) => {
    cancelAnimationFrame(raf);
    stopEnvelope();
    URL.revokeObjectURL(urlToRevoke);
    if (currentAudio === audio) currentAudio = null;
    if (ctx) void ctx.close();
    resolve();
  };

  return new Promise((resolve) => {
    const done = () => finish(url, resolve);
    audio.onended = done;
    audio.onerror = done;
    void audio
      .play()
      .then(async () => {
        try {
          ctx = new AudioContext();
          const src = ctx.createMediaElementSource(audio);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          analyser.connect(ctx.destination);
          const data = new Uint8Array(analyser.fftSize);
          await ctx.resume();
          const sample = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (const v of data) {
              const d = (v - 128) / 128;
              sum += d * d;
            }
            setSpeechLevel(Math.min(1, Math.sqrt(sum / data.length) * 6));
            raf = requestAnimationFrame(sample);
          };
          raf = requestAnimationFrame(sample);
        } catch {
          startEnvelope();
        }
      })
      .catch(done);
  });
}

export async function speakNexVoice(text: string, macVoice?: string) {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken) return;
  try {
    const mac = await speakMac({ data: { text: spoken, voice: macVoice } });
    if (mac.ok) {
      await playAudioBytes(mac.audio, mac.mime);
      return;
    }
  } catch {
    /* browser voice below */
  }
  await speakLocal(spoken);
}
