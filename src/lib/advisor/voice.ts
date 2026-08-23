let currentAudio: HTMLAudioElement | null = null;
let speechLevel = 0;
const levelListeners = new Set<(n: number) => void>();
let envelopeTimer = 0;

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
    const burst = Math.random() < 0.18 ? 0.55 + Math.random() * 0.45 : 0.08 + Math.random() * 0.22;
    setSpeechLevel(burst);
    envelopeTimer = window.setTimeout(tick, 70 + Math.random() * 90);
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
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const prefer = voices.find(
    (v) => /en[-_]US/i.test(v.lang) && /samantha|karen|moira|daniel|alex|martha|serena/i.test(v.name),
  );
  return prefer ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
}

export function speakLocal(text: string): Promise<void> {
  stopVoice();
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken || typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.rate = 0.92;
    utter.pitch = 0.88;
    utter.volume = 1;
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    startEnvelope();
    utter.onend = () => {
      stopEnvelope();
      resolve();
    };
    utter.onerror = () => {
      stopEnvelope();
      resolve();
    };
    window.speechSynthesis.speak(utter);
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
    void audio.play()
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
