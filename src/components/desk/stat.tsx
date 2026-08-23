import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "up" | "down" | "warn";
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-bg-elevated px-3 py-3 sm:px-4">
      <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-base tabular-nums sm:text-lg",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "warn" && "text-warn",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
