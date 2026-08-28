import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

const STATUS: Record<Mood, string> = {
  idle: "on desk",
  listen: "listening",
  speak: "speaking",
  think: "thinking",
};

export function NexPortrait({
  mood = "idle",
  caption,
  className,
}: {
  mood?: Mood;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-bg", className)}>
      <div className="relative mx-auto flex h-full max-h-full w-full max-w-full items-center justify-center px-6 pb-28 pt-16">
        <div className="relative aspect-[2/3] h-full max-h-full w-auto max-w-full">
          <img
            src="/nex/portrait.jpg"
            alt=""
            className="h-full w-full object-contain object-center"
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 transition-opacity duration-300",
              mood === "listen" && "shadow-[inset_0_0_28px_rgba(197,201,209,0.14)]",
              mood === "speak" && "shadow-[inset_0_-24px_32px_rgba(197,201,209,0.1)]",
              mood === "think" && "bg-bg/15",
            )}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/80 to-transparent px-5 pb-4 pt-16">
        <p className="text-[11px] uppercase tracking-[0.28em] text-subtle">Desk steward · {STATUS[mood]}</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Nex</h1>
        {caption ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fg/90">{caption}</p>
        ) : null}
      </div>
      <span className="sr-only">Nex, desk steward for the Operator</span>
    </div>
  );
}
