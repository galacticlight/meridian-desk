const WMO: Record<number, string> = {
  0: "clear",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "rime fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  80: "rain showers",
  81: "showers",
  82: "violent showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "severe thunderstorm",
};

export function isWeatherQuery(query: string) {
  return /\b(weather|temperature|forecast|rain|snow|humid|how hot|how cold|umbrella|windy|degrees)\b/i.test(
    query,
  );
}

export function isLiveQuery(query: string) {
  if (isWeatherQuery(query)) return true;
  return /\b(news|headline|today|latest|this week|who won|score|what time|happening now|on x\b|twitter|search the web)\b/i.test(
    query,
  );
}

export function parsePlace(query: string) {
  const q = query.replace(/[?!.,]+/g, " ").trim();
  const m = q.match(/\b(?:in|for|at|near)\s+([A-Za-z][A-Za-z .'-]{1,40})$/i);
  const place = m?.[1]?.trim();
  return place && !/^(the|a|an|today|now|outside|there|here)$/i.test(place) ? place : null;
}

export function describeWeather(code: number) {
  return WMO[code] ?? "mixed conditions";
}

export function formatWeather(opts: {
  name: string;
  temp: number;
  code: number;
  wind: number;
  humidity: number;
  assumed?: boolean;
}) {
  const sky = describeWeather(opts.code);
  const assume = opts.assumed ? " I assumed this city — name another if that is wrong." : "";
  return `Operator. In ${opts.name} it is ${Math.round(opts.temp)}°C, ${sky}, wind ${Math.round(opts.wind)} km/h, humidity ${Math.round(opts.humidity)}%. Source: Open-Meteo.${assume}`;
}
