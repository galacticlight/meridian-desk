import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export const PREFERRED_MAC_VOICES = [
  "Samantha",
  "Nicky",
  "Ava",
  "Allison",
  "Zoe",
  "Moira",
  "Karen",
  "Serena",
  "Tessa",
  "Fiona",
  "Susan",
  "Kate",
  "Martha",
  "Victoria",
];

const SKIP =
  /compact|novelty|whisper|zarvox|trinoids|bells|boing|bubbles|cellos|bad news|good news|albert|bahh|ralph|fred|junior|princess|agnes|bruce|kathy|organ|pipe|robot|google|microsoft/i;

export type MacVoice = { id: string; name: string; lang: string };

export function parseSayVoices(stdout: string): MacVoice[] {
  const out: MacVoice[] = [];
  for (const line of stdout.split("\n")) {
    const m = line.match(/^(.+?)\s+([a-z]{2}[_-][A-Za-z]{2,4})\s+#/);
    if (!m) continue;
    const name = m[1]!.trim();
    const lang = m[2]!.replace("_", "-");
    if (!name || SKIP.test(name)) continue;
    if (!lang.toLowerCase().startsWith("en")) continue;
    out.push({ id: name, name, lang });
  }
  return out.sort((a, b) => rankMacVoice(a.name) - rankMacVoice(b.name));
}

export function rankMacVoice(name: string) {
  const i = PREFERRED_MAC_VOICES.findIndex((v) => name.toLowerCase().startsWith(v.toLowerCase()));
  return i === -1 ? 80 : i;
}

export function pickDefaultMacVoice(voices: MacVoice[]) {
  return voices[0]?.id ?? "Samantha";
}

export function withSayPauses(text: string) {
  return text
    .replace(/^Operator\.\s*/i, "Operator. [[slnc 280]] ")
    .replace(/\.\s+/g, ". [[slnc 140]] ");
}

export async function listInstalledMacVoices(): Promise<MacVoice[]> {
  if (process.platform !== "darwin") return [];
  try {
    const { stdout } = await execFileAsync("say", ["-v", "?"], { timeout: 4000 });
    return parseSayVoices(stdout);
  } catch {
    return [];
  }
}

export async function renderMacSpeech(text: string, voice?: string) {
  if (process.platform !== "darwin") return null;
  const spoken = text.replace(/\s+/g, " ").trim().slice(0, 480);
  if (!spoken) return null;
  const installed = await listInstalledMacVoices();
  const allowed = new Set(installed.map((v) => v.id));
  const choice =
    (voice && allowed.has(voice) ? voice : null) ?? pickDefaultMacVoice(installed);
  if (!choice) return null;
  const dir = await mkdtemp(join(tmpdir(), "nex-say-"));
  const file = join(dir, "nex.wav");
  try {
    await execFileAsync(
      "say",
      ["-v", choice, "-r", "168", "-o", file, "--data-format=LEI16@22050", withSayPauses(spoken)],
      { timeout: 20000 },
    );
    const buf = await readFile(file);
    if (buf.byteLength < 80) return null;
    return { mime: "audio/wav" as const, audio: buf.toString("base64"), voice: choice };
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
