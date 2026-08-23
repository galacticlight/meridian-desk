import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchCorpus } from "./corpus.ts";
import { NEX_GREETING, NEX_GREETING_SPOKEN, localAdvise, spokenFromReply } from "./local-agent.ts";

describe("local Nex library", () => {
  it("retrieves allocation passages", () => {
    const hits = searchCorpus("asset allocation diversification");
    assert.ok(hits.length >= 1);
    assert.ok(hits.some((h) => /allocat|diversif/i.test(h.title + h.body)));
  });

  it("refuses stock picks and addresses Operator", () => {
    const r = localAdvise("Should I buy NVDA today?");
    assert.match(r.text, /will not pick|not a registered|education/i);
    assert.match(r.text, /^Operator/);
    assert.equal(r.mode, "local");
  });

  it("explains forecasts with citations", () => {
    const r = localAdvise("What can this forecast actually tell me?");
    assert.ok(r.citations.length >= 1);
    assert.ok(r.citations.every((c) => c.url.startsWith("http")));
    assert.match(r.text, /^Operator/);
  });

  it("greeting names Operator", () => {
    assert.match(NEX_GREETING, /^Operator\./);
    assert.match(NEX_GREETING_SPOKEN, /^Operator\./);
    assert.match(spokenFromReply(NEX_GREETING_SPOKEN), /Operator/);
  });

  it("chats as a companion", () => {
    const r = localAdvise("Who are you?");
    assert.match(r.text, /Operator/);
    assert.match(r.text, /research companion/i);
  });
});
