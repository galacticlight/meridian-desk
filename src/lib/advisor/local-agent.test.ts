import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchCorpus } from "./corpus.ts";
import { localAdvise } from "./local-agent.ts";

describe("local Nex library", () => {
  it("retrieves allocation passages", () => {
    const hits = searchCorpus("asset allocation diversification");
    assert.ok(hits.length >= 1);
    assert.ok(hits.some((h) => /allocat|diversif/i.test(h.title + h.body)));
  });

  it("refuses stock picks", () => {
    const r = localAdvise("Should I buy NVDA today?");
    assert.match(r.text, /will not pick|not a registered|education/i);
    assert.equal(r.mode, "local");
  });

  it("explains forecasts with citations", () => {
    const r = localAdvise("What can this forecast actually tell me?");
    assert.ok(r.citations.length >= 1);
    assert.ok(r.citations.every((c) => c.url.startsWith("http")));
  });
});
