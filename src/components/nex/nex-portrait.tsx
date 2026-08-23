import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

function Lightning({ mood }: { mood: Mood }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g
        className={cn("nex-filament origin-center", mood === "think" && "opacity-50")}
        fill="none"
        stroke="rgba(186, 230, 232, 0.85)"
        strokeWidth="0.7"
        strokeLinecap="round"
      >
        <path d="M42 108 C70 96, 110 94, 158 108" strokeDasharray="10 18" />
        <path d="M48 118 C80 108, 120 108, 154 120" strokeDasharray="6 14" opacity="0.7" />
        <path d="M86 92 L92 118 L78 132 L104 148" className="nex-bolt" />
        <path d="M128 90 L122 114 L138 128 L118 150" className="nex-bolt" />
      </g>
      <rect className="nex-flash" x="30" y="70" width="140" height="90" rx="28" fill="rgba(210,240,242,0.55)" />
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
        <div className="relative aspect-[2/3] h-full max-h-full w-auto max-w-full">
          {reduce ? (
            <img
              src="/nex/portrait.jpg"
              alt=""
              className="h-full w-full object-contain object-center"
            />
          ) : (
            <video
              className="h-full w-full object-contain object-center"
              src="/nex/idle.mp4?v=2"
              poster="/nex/portrait.jpg"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          )}
          {reduce ? null : <Lightning mood={mood} />}
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              mood === "listen" && "shadow-[inset_0_0_28px_rgba(197,201,209,0.22)]",
              mood === "speak" && "shadow-[inset_0_-24px_32px_rgba(197,201,209,0.16)]",
              mood === "think" && "bg-bg/20",
            )}
          />
        </div>
      </div>
      <span className="sr-only">Nex, local research companion</span>
    </div>
  );
}
