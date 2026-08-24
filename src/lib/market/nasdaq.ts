export function parseMoney(raw: string | number | null | undefined) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (!raw) return null;
  const n = Number(String(raw).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function parseNasdaqDate(raw: string) {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}

export type NasdaqHistRow = {
  date: string;
  close: string;
  volume: string;
  open: string;
  high: string;
  low: string;
};

export function barsFromNasdaq(rows: NasdaqHistRow[]) {
  const bars = [];
  for (const row of rows) {
    const date = parseNasdaqDate(row.date);
    const close = parseMoney(row.close);
    if (!date || close == null) continue;
    bars.push({
      date,
      open: parseMoney(row.open) ?? close,
      high: parseMoney(row.high) ?? close,
      low: parseMoney(row.low) ?? close,
      close,
      volume: parseMoney(row.volume) ?? 0,
    });
  }
  bars.sort((a, b) => a.date.localeCompare(b.date));
  return bars;
}

export function looksLikeTicker(token: string) {
  return /^[A-Za-z]{1,5}(\.[A-Za-z])?$/.test(token.trim());
}
