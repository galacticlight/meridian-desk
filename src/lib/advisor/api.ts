import { createServerFn } from "@tanstack/react-start";
import { CORPUS, searchCorpus } from "./corpus";
import { systemPrompt } from "./local-agent";
import { listInstalledMacVoices, renderMacSpeech } from "./mac-say";
import { extractResponse, type ChatTurn } from "./response";
import { formatWeather, parsePlace } from "./weather";

export const getWeather = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const place = parsePlace(data.query) ?? "Seattle";
    const assumed = !parsePlace(data.query);
    const headers = { "User-Agent": "NexCompanion/1.0" };
    const wttr = await fetch(
      `https://wttr.in/${encodeURIComponent(place)}?format=j1`,
      { headers },
    );
    if (wttr.ok) {
      const body = (await wttr.json()) as {
        current_condition?: {
          temp_C: string;
          humidity: string;
          windspeedKmph: string;
          weatherDesc?: { value: string }[];
        }[];
        nearest_area?: { areaName?: { value: string }[]; region?: { value: string }[] }[];
      };
      const cur = body.current_condition?.[0];
      const area = body.nearest_area?.[0];
      if (cur) {
        const name = [area?.areaName?.[0]?.value, area?.region?.[0]?.value].filter(Boolean).join(", ") || place;
        const desc = cur.weatherDesc?.[0]?.value?.toLowerCase() || "mixed conditions";
        const text = `Operator. In ${name} it is ${Math.round(Number(cur.temp_C))}°C, ${desc}, wind ${Math.round(Number(cur.windspeedKmph))} km/h, humidity ${Math.round(Number(cur.humidity))}%. Source: wttr.in.${assumed ? " I assumed this city — name another if that is wrong." : ""}`;
        return {
          ok: true as const,
          text,
          citations: [{ title: `wttr.in/${place}`, source: "wttr.in", url: `https://wttr.in/${encodeURIComponent(place)}` }],
          mode: "research" as const,
        };
      }
    }

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`,
    );
    if (!geoRes.ok) return { ok: false as const, error: "geo" };
    const geo = (await geoRes.json()) as {
      results?: { name: string; latitude: number; longitude: number; admin1?: string }[];
    };
    const hit = geo.results?.[0];
    if (!hit) return { ok: false as const, error: "place" };
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`,
    );
    if (!wxRes.ok) return { ok: false as const, error: "weather" };
    const wx = (await wxRes.json()) as {
      current?: {
        temperature_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        relative_humidity_2m: number;
      };
    };
    const cur = wx.current;
    if (!cur) return { ok: false as const, error: "empty" };
    const name = hit.admin1 ? `${hit.name}, ${hit.admin1}` : hit.name;
    return {
      ok: true as const,
      text: formatWeather({
        name,
        temp: cur.temperature_2m,
        code: cur.weather_code,
        wind: cur.wind_speed_10m,
        humidity: cur.relative_humidity_2m,
        assumed,
      }),
      citations: [
        {
          title: "Open-Meteo forecast",
          source: "Open-Meteo",
          url: "https://open-meteo.com/",
        },
      ],
      mode: "research" as const,
    };
  });


export const askNex = createServerFn({ method: "POST" })
  .validator(
    (input: { query: string; context: string; history?: ChatTurn[]; research?: boolean }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "offline" };

    const hits = searchCorpus(data.query, 5);
    const library =
      hits.length > 0
        ? hits.map((h) => `[${h.sourceLabel}] ${h.title}: ${h.body}`).join("\n")
        : CORPUS.slice(0, 5)
            .map((h) => `[${h.sourceLabel}] ${h.title}: ${h.body}`)
            .join("\n");

    const prior = (data.history ?? []).slice(-8).map((t) => ({
      role: t.role === "you" ? "user" : "assistant",
      content: t.text.slice(0, 800),
    }));

    if (data.research) {
      const res = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_output_tokens: 500,
          input: [
            { role: "system", content: systemPrompt() },
            ...prior,
            {
              role: "user",
              content: `Local library:\n${library}\n\nDesk:\n${data.context}\n\nOperator:\n${data.query}`,
            },
          ],
          tools: [{ type: "web_search" }, { type: "x_search" }],
        }),
      });
      if (res.ok) {
        const parsed = extractResponse(await res.json());
        if (parsed.text) {
          return {
            ok: true as const,
            text: parsed.text,
            citations:
              parsed.citations.length > 0
                ? parsed.citations
                : hits.map((h) => ({ title: h.title, source: h.sourceLabel, url: h.url })),
            mode: "research" as const,
          };
        }
      }
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        temperature: 0.45,
        messages: [
          { role: "system", content: systemPrompt() },
          ...prior,
          {
            role: "user",
            content: `Library:\n${library}\n\nDesk context:\n${data.context}\n\nQuestion:\n${data.query}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI ${res.status}` };
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "empty" };
    return {
      ok: true as const,
      text,
      citations: hits.map((h) => ({
        title: h.title,
        source: h.sourceLabel,
        url: h.url,
      })),
      mode: "grok" as const,
    };
  });

export const listMacVoices = createServerFn({ method: "GET" }).handler(async () => {
  const voices = await listInstalledMacVoices();
  return { ok: true as const, voices };
});

export const speakMac = createServerFn({ method: "POST" })
  .validator((input: { text: string; voice?: string }) => input)
  .handler(async ({ data }) => {
    const rendered = await renderMacSpeech(data.text, data.voice);
    if (!rendered) return { ok: false as const, error: "unavailable" };
    return { ok: true as const, ...rendered };
  });
