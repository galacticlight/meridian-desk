import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSayVoices, pickDefaultMacVoice, withSayPauses } from "./mac-say.ts";

describe("mac say voices", () => {
  it("parses English voices and prefers Samantha", () => {
    const stdout = [
      "Fred                en_US    # I sure like being inside this fancy computer",
      "Samantha            en_US    # Hello! My name is Samantha.",
      "Zarvox              en_US    #",
      "Moira               en_IE    # Hello, my name is Moira.",
      "Kyoko               ja_JP    #",
    ].join("\n");
    const voices = parseSayVoices(stdout);
    assert.equal(pickDefaultMacVoice(voices), "Samantha");
    assert.ok(voices.every((v) => v.lang.startsWith("en")));
    assert.ok(!voices.some((v) => /fred|zarvox/i.test(v.name)));
  });

  it("inserts Operator pause marks", () => {
    assert.match(withSayPauses("Operator. Nex on desk."), /\[\[slnc 280\]\]/);
  });
});
