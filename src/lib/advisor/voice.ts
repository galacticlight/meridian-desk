let currentAudio: HTMLAudioElement | null = null;

export function stopVoice() {
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
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
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
  return new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    void audio.play().catch(() => resolve());
  });
}
