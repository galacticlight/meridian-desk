import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { portfolioMonteCarlo, runForecast, riskSnapshot } from "./forecast.ts";
import { cholesky, ewmaVol, logReturns, mean, stdev, studentT, mulberry32 } from "./math.ts";
import { synthesizeSeries } from "./synthetic.ts";

describe("forecast engine", () => {
  const series = synthesizeSeries("AAPL");
  const msft = synthesizeSeries("MSFT");

  it("synthesizes a tradable tape", () => {
    assert.ok(series.bars.length > 200);
    assert.ok(series.bars.every((b) => b.close > 0 && b.high >= b.low));
  });

  it("computes finite risk metrics including EWMA", () => {
    const r = riskSnapshot(series);
    assert.equal(Number.isFinite(r.last), true);
    assert.equal(Number.isFinite(r.vol), true);
    assert.equal(Number.isFinite(r.ewmaVol), true);
    assert.ok(r.maxDrawdown <= 0);
    assert.ok(r.rsi >= 0 && r.rsi <= 100);
  });

  it("GBM ensemble produces ordered bands", () => {
    const f = runForecast(series, "ensemble", "63d", 80);
    assert.ok(f.bands.length > 10);
    for (const b of f.bands) {
      assert.ok(b.p05 <= b.median && b.median <= b.p95);
    }
    assert.equal(Number.isFinite(f.expected), true);
  });

  it("GARCH-t and regime models stay finite", () => {
    for (const id of ["garch", "regime", "bootstrap", "sequence"] as const) {
      const f = runForecast(series, id, "21d", 40);
      assert.ok(f.bands.length > 5);
      assert.equal(Number.isFinite(f.expected), true);
      const last = f.bands.at(-1)!;
      assert.ok(last.p05 <= last.p95);
    }
  });

  it("correlated book simulation is ordered", () => {
    const book = portfolioMonteCarlo([series, msft], 21, 80);
    assert.ok(book.p05 <= book.median && book.median <= book.p95);
    assert.ok(book.start > 0);
  });

  it("log returns and math helpers are well-defined", () => {
    const r = logReturns(series.bars.map((b) => b.close));
    assert.ok(r.length > 100);
    assert.equal(Number.isFinite(mean(r)), true);
    assert.ok(stdev(r) > 0);
    assert.ok(ewmaVol(r) > 0);
    const L = cholesky([
      [1, 0.3],
      [0.3, 1],
    ]);
    assert.ok(L[0]![0]! > 0);
    const rand = mulberry32(7);
    assert.equal(Number.isFinite(studentT(rand, 6)), true);
  });
});
