import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { barsFromNasdaq, looksLikeTicker, parseMoney, parseNasdaqDate } from "./nasdaq.ts";

describe("nasdaq tape parsers", () => {
  it("reads SEV last sale", () => {
    assert.equal(parseMoney("$2.47"), 2.47);
    assert.equal(parseMoney("1,429,364"), 1429364);
    assert.equal(parseNasdaqDate("08/21/2026"), "2026-08-21");
    assert.equal(looksLikeTicker("SEV"), true);
    assert.equal(looksLikeTicker("Aptera"), false);
  });

  it("orders history oldest first", () => {
    const bars = barsFromNasdaq([
      { date: "08/21/2026", close: "$2.47", volume: "10", open: "$2.39", high: "$2.49", low: "$2.29" },
      { date: "08/20/2026", close: "$2.35", volume: "8", open: "$2.12", high: "$2.37", low: "$2.11" },
    ]);
    assert.equal(bars[0]?.date, "2026-08-20");
    assert.equal(bars.at(-1)?.close, 2.47);
  });
});
