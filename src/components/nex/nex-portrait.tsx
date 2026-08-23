import { useEffect, useRef, useState } from "react";
import { getSpeechLevel, subscribeSpeechLevel } from "@/lib/advisor/voice";
import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

function load(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  if (!img.complete || !img.naturalWidth) return;
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dh = w / ir;
    dy = (h - dh) / 2 - h * 0.06;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function NexPortrait({
  mood = "idle",
  className,
}: {
  mood?: Mood;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const idle = load("/nex/portrait.jpg");
    const blinkImg = load("/nex/blink.jpg");
    const speakImg = load("/nex/speak.jpg");
    let alive = true;
    let raf = 0;
    const t0 = performance.now();
    let blinkAmt = 0;
    let blinkPhase: "open" | "closing" | "shut" | "opening" = "open";
    let nextBlink = t0 + 480;
    let phaseUntil = 0;
    let doublePending = false;
    let speech = getSpeechLevel();
    const unsub = subscribeSpeechLevel((n) => {
      speech = n;
    });

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = (now: number) => {
      if (!alive) return;
      const t = (now - t0) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const m = moodRef.current;

      if (blinkPhase === "open" && now > nextBlink) {
        blinkPhase = "closing";
        phaseUntil = now + 110;
        doublePending = Math.random() < 0.2;
      } else if (blinkPhase === "closing" && now >= phaseUntil) {
        blinkPhase = "shut";
        phaseUntil = now + 180;
      } else if (blinkPhase === "shut" && now >= phaseUntil) {
        blinkPhase = "opening";
        phaseUntil = now + 120;
      } else if (blinkPhase === "opening" && now >= phaseUntil) {
        blinkPhase = "open";
        blinkAmt = 0;
        nextBlink = now + (doublePending ? 80 + Math.random() * 70 : 1600 + Math.random() * 2800);
        doublePending = false;
      }
      if (blinkPhase === "closing") blinkAmt = 1 - (phaseUntil - now) / 110;
      else if (blinkPhase === "shut") blinkAmt = 1;
      else if (blinkPhase === "opening") blinkAmt = (phaseUntil - now) / 120;
      blinkAmt = Math.max(0, Math.min(1, blinkAmt));

      const breathe = 0.5 * Math.sin(t * 0.7) + 0.3 * Math.sin(t * 1.17 + 1.2) + 0.2 * Math.sin(t * 0.23);
      const scale = 1.03 + breathe * 0.01 + (m === "listen" ? 0.01 : 0);
      const oy = breathe * h * 0.006;

      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2 + oy);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      cover(ctx, idle, w, h);

      if (blinkAmt > 0.02 && blinkImg.complete) {
        ctx.globalAlpha = blinkAmt;
        cover(ctx, blinkImg, w, h);
        ctx.globalAlpha = 1;
      }

      const talk =
        m === "speak"
          ? 0.35 + 0.65 * Math.abs(Math.sin(t * 10.2)) * (0.35 + speech)
          : speech > 0.06
            ? speech
            : 0;
      if (talk > 0.05 && speakImg.complete) {
        ctx.globalAlpha = Math.min(0.95, talk);
        cover(ctx, speakImg, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      if (m === "think") {
        ctx.fillStyle = "rgba(8, 8, 10, 0.18)";
        ctx.fillRect(0, 0, w, h);
      }
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.4, h * 0.18, w * 0.5, h * 0.5, h * 0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(8,8,10,0.42)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
    };
    if (idle.complete) start();
    else idle.onload = start;

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
    };
  }, [reduce]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden bg-bg", className)}>
      {reduce ? (
        <img src="/nex/portrait.jpg" alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      )}
      <span className="sr-only">Nex, local research companion</span>
    </div>
  );
}
