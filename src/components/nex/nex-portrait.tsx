import { useEffect, useRef } from "react";
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
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.pause();
      return;
    }
    el.playbackRate = mood === "speak" ? 1.08 : mood === "think" ? 0.82 : 1;
    const play = () => {
      void el.play().catch(() => {
        /* autoplay may wait for a gesture */
      });
    };
    play();
    const onPointer = () => play();
    window.addEventListener("pointerdown", onPointer, { once: true });
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [mood]);

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-bg", className)}>
      <div className="relative mx-auto flex h-full max-h-full w-full max-w-full items-center justify-center px-4 pb-32 pt-10 sm:px-8">
        <div className="relative aspect-[2/3] h-full max-h-full w-auto max-w-full">
          <video
            ref={video}
            className="h-full w-full object-contain object-center"
            src="/nex/idle.mp4"
            poster="/nex/portrait.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/85 to-transparent px-5 pb-5 pt-20">
        <p className="text-[11px] uppercase tracking-[0.28em] text-subtle">Nex · {STATUS[mood]}</p>
        {caption ? (
          <p className="mt-2 max-w-md font-display text-lg leading-snug text-fg/92 line-clamp-3 sm:text-xl">{caption}</p>
        ) : (
          <p className="mt-2 font-display text-lg text-muted">Desk steward</p>
        )}
      </div>
      <span className="sr-only">Nex, desk steward for the Operator</span>
    </div>
  );
}
