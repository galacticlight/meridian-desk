import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalReply, localAdvise, NEX_GREETING } from "./local-agent.ts";
import { createMemory, ingestOperatorUtterance } from "./memory.ts";
import { NORTH_STAR } from "./pack.ts";
import { tokenizeForStream } from "./stream.ts";

describe("nex precepts", () => {
  it("names Operator and refuses picks", () => {
    assert.match(NEX_GREETING, /Operator/);
    assert.match(NEX_GREETING, /Nex/);
    const pick = canonicalReply("Should I buy NVDA today?");
    assert.ok(pick);
    assert.match(pick.text, /will not pick/i);
    const who = canonicalReply("Who are you?");
    assert.ok(who);
    assert.match(who.text, /I am Nex/);
    assert.doesNotMatch(who.text, /cephalon|Ordis/i);
  });

  it("keeps Operator memory", () => {
    const m = ingestOperatorUtterance(createMemory(), "Remember that I like long horizons");
    assert.ok(m.likes.some((l) => /long horizons/i.test(l)));
  });

  it("tokenizes for live captions", () => {
    const t = tokenizeForStream(NORTH_STAR);
    assert.ok(t.length > 3);
    assert.equal(t.join(""), NORTH_STAR);
  });

  it("does not dump a library chapter", () => {
    const r = localAdvise("How should I think about asset allocation?");
    assert.ok(r.text.length < 900);
    assert.match(r.text, /Operator/);
  });
});
