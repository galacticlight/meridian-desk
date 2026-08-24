import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

export function NexPortrait({
  mood = "idle",
  className,
}: {
  mood?: Mood;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-bg", className)}>
      <div className="relative mx-auto flex h-full max-h-full w-full max-w-full items-center justify-center px-6 pb-24 pt-16">
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
      <span className="sr-only">Nex, local research companion</span>
    </div>
  );
}
