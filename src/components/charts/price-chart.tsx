import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bar as PriceBar } from "@/lib/market/types";
import { formatCompact, formatMoney } from "@/lib/utils";

export function PriceChart({ bars }: { bars: PriceBar[] }) {
  const data = bars.slice(-180).map((b) => ({
    ...b,
    range: [b.low, b.high] as [number, number],
    up: b.close >= b.open,
  }));

  return (
    <div className="h-[320px] w-full sm:h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(236,236,238,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6e6e76", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="p"
            domain={["auto", "auto"]}
            tick={{ fill: "#6e6e76", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <YAxis yAxisId="v" orientation="right" hide domain={[0, "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#121214",
              border: "1px solid rgba(236,236,238,0.12)",
              borderRadius: 12,
              color: "#ececee",
            }}
            formatter={(value, name) => {
              if (name === "close") return [formatMoney(Number(value)), "Close"];
              if (name === "volume") return [formatCompact(Number(value)), "Volume"];
              return [String(value), String(name)];
            }}
          />
          <Bar
            yAxisId="v"
            dataKey="volume"
            fill="rgba(197,201,209,0.16)"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="p"
            type="monotone"
            dataKey="close"
            stroke="#c5c9d1"
            strokeWidth={1.6}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
