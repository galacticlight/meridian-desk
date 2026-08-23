import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

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
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-bg",
        mood === "think" && "opacity-80",
        className,
      )}
    >
      {reduce ? (
        <img
          src="/nex/portrait.jpg"
          alt=""
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <video
          className="h-full w-full object-cover object-top"
          src="/nex/idle.mp4"
          poster="/nex/portrait.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          mood === "listen" && "ring-inset shadow-[inset_0_0_24px_rgba(197,201,209,0.28)]",
          mood === "speak" && "shadow-[inset_0_-18px_28px_rgba(197,201,209,0.18)]",
        )}
      />
      <span className="sr-only">Nex, local research companion</span>
    </div>
  );
}
