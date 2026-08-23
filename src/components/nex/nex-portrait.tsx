import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

function ScarLightning({ mood }: { mood: Mood }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="nex-cheek" cx="46%" cy="40%" r="22%">
          <stop offset="0%" stopColor="rgba(164, 224, 226, 0.42)" />
          <stop offset="55%" stopColor="rgba(120, 180, 184, 0.12)" />
          <stop offset="100%" stopColor="rgba(120, 180, 184, 0)" />
        </radialGradient>
        <filter id="nex-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>
      <ellipse
        className={cn("nex-cheek-pulse", mood === "think" && "opacity-40", mood === "speak" && "opacity-100")}
        cx="92"
        cy="124"
        rx="34"
        ry="48"
        fill="url(#nex-cheek)"
      />
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#nex-soft)"
      >
        <path
          className="nex-scar-glow"
          d="M90 106 C98 120 86 134 96 148 C108 162 88 176 94 194"
          stroke="rgba(186, 230, 232, 0.35)"
          strokeWidth="3.2"
        />
        <path
          className="nex-scar-trace"
          d="M90 106 C98 120 86 134 96 148 C108 162 88 176 94 194"
          stroke="rgba(210, 244, 246, 0.9)"
          strokeWidth="1.15"
          strokeDasharray="18 28"
        />
        <path
          className="nex-scar-trace"
          d="M96 130 L88 144"
          stroke="rgba(210, 244, 246, 0.55)"
          strokeWidth="0.7"
          strokeDasharray="6 14"
        />
      </g>
    </svg>
  );
}

export function NexPortrait({
  mood = "idle",
  className,
}: {
  mood?: Mood;
  className?: string;
}) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-bg", className)}>
      <div className="relative mx-auto flex h-full max-h-full w-full max-w-full items-center justify-center px-6 pb-24 pt-16">
        <div className={cn("relative aspect-[2/3] h-full max-h-full w-auto max-w-full", !reduce && "nex-breathe")}>
          <img
            src="/nex/portrait.jpg"
            alt=""
            className="h-full w-full object-contain object-center"
          />
          {reduce ? null : <ScarLightning mood={mood} />}
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              mood === "listen" && "shadow-[inset_0_0_28px_rgba(197,201,209,0.14)]",
              mood === "speak" && "shadow-[inset_0_-24px_32px_rgba(197,201,209,0.1)]",
              mood === "think" && "bg-bg/15",
            )}
          />
        </div>
      </div>
      <span className="sr-only">Nex, local research companion</span>
    </div>
  );
}
