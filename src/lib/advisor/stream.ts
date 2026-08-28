export function tokenizeForStream(text: string): string[] {
  const parts = text.match(/\s+|[^\s]+/g);
  return parts ?? [text];
}

export async function playTokens(
  text: string,
  onToken: (soFar: string) => void,
  opts?: { delayMs?: number; signal?: AbortSignal },
) {
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    onToken(text);
    return;
  }
  const tokens = tokenizeForStream(text);
  let soFar = "";
  for (const t of tokens) {
    if (opts?.signal?.aborted) return;
    soFar += t;
    onToken(soFar);
    await new Promise((r) => setTimeout(r, opts?.delayMs ?? 16));
  }
}
