import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastResult } from "@/lib/market/types";
import { formatCompact, formatMoney } from "@/lib/utils";

export function ForecastChart({ forecast }: { forecast: ForecastResult }) {
  const data = forecast.bands.map((b, i) => {
    const row: Record<string, number> = {
      day: b.day,
      p05: b.p05,
      p95: b.p95,
      p25: b.p25,
      p75: b.p75,
      median: b.median,
      band: b.p95 - b.p05,
      inner: b.p75 - b.p25,
    };
    forecast.samplePaths.forEach((p, idx) => {
      row[`p${idx}`] = p[i] ?? p.at(-1)!;
    });
    return row;
  });

  return (
    <div className="h-[280px] w-full sm:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(236,236,238,0.06)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#6e6e76", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#6e6e76", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <Tooltip
            contentStyle={{
              background: "#121214",
              border: "1px solid rgba(236,236,238,0.12)",
              borderRadius: 12,
            }}
            formatter={(value, name) => {
              if (name === "median") return [formatMoney(Number(value)), "Median"];
              if (name === "p05") return [formatMoney(Number(value)), "5th"];
              if (name === "p95") return [formatMoney(Number(value)), "95th"];
              return [formatMoney(Number(value)), String(name)];
            }}
          />
          <Area type="monotone" dataKey="p95" stroke="none" fill="rgba(197,201,209,0.08)" />
          <Area type="monotone" dataKey="p05" stroke="none" fill="#0a0a0b" />
          <Line type="monotone" dataKey="median" stroke="#ececee" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p05" stroke="#6e6e76" strokeDasharray="3 4" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="p95" stroke="#6e6e76" strokeDasharray="3 4" strokeWidth={1} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
