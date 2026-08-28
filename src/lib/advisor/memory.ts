export type OperatorMemory = {
  addressAs: string;
  likes: string[];
  dislikes: string[];
  notes: string[];
  facts: Record<string, string>;
  lastTickers: string;
  updatedAt: number;
};

const KEY = "nex-operator-memory-v1";

export const DEFAULT_MEMORY: OperatorMemory = {
  addressAs: "Operator",
  likes: [],
  dislikes: [],
  notes: [],
  facts: {},
  lastTickers: "AAPL",
  updatedAt: 0,
};

function clean(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "");
}

export function createMemory(partial?: Partial<OperatorMemory>): OperatorMemory {
  return {
    ...DEFAULT_MEMORY,
    ...partial,
    likes: [...(partial?.likes ?? DEFAULT_MEMORY.likes)],
    dislikes: [...(partial?.dislikes ?? DEFAULT_MEMORY.dislikes)],
    notes: [...(partial?.notes ?? DEFAULT_MEMORY.notes)],
    facts: { ...DEFAULT_MEMORY.facts, ...(partial?.facts ?? {}) },
    lastTickers: partial?.lastTickers ?? DEFAULT_MEMORY.lastTickers,
    updatedAt: partial?.updatedAt ?? Date.now(),
  };
}

export function loadMemory(): OperatorMemory {
  if (typeof localStorage === "undefined") return createMemory();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createMemory();
    const parsed = JSON.parse(raw) as Partial<OperatorMemory>;
    return createMemory(parsed);
  } catch {
    return createMemory();
  }
}

export function saveMemory(memory: OperatorMemory) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* quota */
  }
}

export function ingestOperatorUtterance(memory: OperatorMemory, text: string): OperatorMemory {
  const next = createMemory(memory);
  const like = /\b(?:remember that )?i (?:like|love|enjoy) ([^.!?]+)/i.exec(text);
  if (like) {
    const value = clean(like[1]);
    if (value && !next.likes.includes(value)) next.likes.push(value);
  }
  const hate = /\b(?:remember that )?i (?:dislike|hate|can'?t stand) ([^.!?]+)/i.exec(text);
  if (hate) {
    const value = clean(hate[1]);
    if (value && !next.dislikes.includes(value)) next.dislikes.push(value);
  }
  const note = /\b(?:remember(?: this| that)?[:\s]+)(.+)/i.exec(text);
  if (note && !like && !hate) {
    const value = clean(note[1]);
    if (value && !next.notes.includes(value)) next.notes.push(value.slice(0, 240));
  }
  next.updatedAt = Date.now();
  return next;
}

export function rememberTickers(memory: OperatorMemory, tickers: string): OperatorMemory {
  const next = createMemory(memory);
  next.lastTickers = tickers.trim() || next.lastTickers;
  next.updatedAt = Date.now();
  return next;
}

export function formatMemoryBlock(memory: OperatorMemory): string {
  const lines = [`Preferred address: ${memory.addressAs}`];
  if (memory.likes.length) lines.push(`Likes: ${memory.likes.join("; ")}`);
  if (memory.dislikes.length) lines.push(`Dislikes: ${memory.dislikes.join("; ")}`);
  if (memory.notes.length) lines.push(`Notes: ${memory.notes.join("; ")}`);
  if (memory.lastTickers) lines.push(`Last tape: ${memory.lastTickers}`);
  const facts = Object.entries(memory.facts);
  if (facts.length) lines.push(`Facts: ${facts.map(([k, v]) => `${k}=${v}`).join("; ")}`);
  return lines.join("\n");
}
