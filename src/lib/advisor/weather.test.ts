import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatWeather, isLiveQuery, isWeatherQuery, parsePlace } from "./weather.ts";

describe("weather intent", () => {
  it("detects weather and a city", () => {
    assert.equal(isWeatherQuery("What's the weather in Seattle?"), true);
    assert.equal(parsePlace("What's the weather in Seattle?"), "Seattle");
    assert.equal(isLiveQuery("latest news"), true);
    assert.equal(isWeatherQuery("asset allocation"), false);
  });

  it("formats a reading", () => {
    const t = formatWeather({
      name: "Seattle",
      temp: 12.4,
      code: 3,
      wind: 8.2,
      humidity: 78,
    });
    assert.match(t, /Operator/);
    assert.match(t, /Seattle/);
    assert.match(t, /overcast/);
  });
});
