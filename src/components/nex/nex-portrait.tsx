import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

const STATUS: Record<Mood, string> = {
  idle: "on desk",
  listen: "listening",
  speak: "speaking",
  think: "thinking",
};

const FADE = 0.7;

export function NexPortrait({
  mood = "idle",
  caption,
  className,
}: {
  mood?: Mood;
  caption?: string;
  className?: string;
}) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      a.pause();
      b.pause();
      return;
    }

    let active = a;
    let standby = b;
    let raf = 0;
    active.style.opacity = "1";
    standby.style.opacity = "0";

    const play = (el: HTMLVideoElement) => {
      el.playbackRate = 1;
      void el.play().catch(() => undefined);
    };

    const tick = () => {
      const dur = active.duration;
      if (Number.isFinite(dur) && dur > FADE + 0.2) {
        const left = dur - active.currentTime;
        if (left <= FADE) {
          if (standby.paused) {
            standby.currentTime = 0;
            play(standby);
          }
          const t = Math.max(0, Math.min(1, 1 - left / FADE));
          standby.style.opacity = String(t);
          active.style.opacity = String(1 - t);
        }
        if (left <= 0.04 || active.ended) {
          active.pause();
          active.currentTime = 0;
          active.style.opacity = "0";
          standby.style.opacity = "1";
          const swap = active;
          active = standby;
          standby = swap;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    play(active);
    raf = requestAnimationFrame(tick);
    const onPointer = () => play(active);
    window.addEventListener("pointerdown", onPointer, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  const videoClass = "absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-75";

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-bg", className)}>
      <div className="relative mx-auto flex h-full max-h-full w-full max-w-full items-center justify-center px-4 pb-32 pt-10 sm:px-8">
        <div className="relative aspect-[2/3] h-full max-h-full w-auto max-w-full">
          <img src="/nex/portrait.jpg" alt="" className="h-full w-full object-contain object-center" />
          <video
            ref={aRef}
            className={videoClass}
            src="/nex/idle.mp4"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <video
            ref={bRef}
            className={videoClass}
            src="/nex/idle.mp4"
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
