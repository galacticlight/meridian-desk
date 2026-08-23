import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractResponse } from "./response.ts";

describe("research response parser", () => {
  it("reads output_text and url citations", () => {
    const r = extractResponse({
      output_text: "Operator. Volatility is a process, not a verdict.",
      citations: ["https://www.investopedia.com/terms/v/volatility.asp", "https://x.com/elonmusk/status/1"],
    });
    assert.match(r.text, /Operator/);
    assert.equal(r.citations.length, 2);
    assert.equal(r.citations[1]?.source, "X");
  });
});
