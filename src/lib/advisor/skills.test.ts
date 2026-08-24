import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockReply, isTapeQuery, isTimeQuery, tapeReply } from "./skills.ts";

describe("nex skills", () => {
  it("answers the clock", () => {
    assert.equal(isTimeQuery("What time is it?"), true);
    assert.match(clockReply().text, /^Operator/);
    assert.match(clockReply().text, /Pacific|PDT|PST/);
  });

  it("needs a tape for a brief", () => {
    assert.equal(isTapeQuery("Brief me on the tape"), true);
    const empty = tapeReply();
    assert.match(empty.text, /No tape is loaded/);
  });
});
