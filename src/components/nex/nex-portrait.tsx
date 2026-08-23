import { useEffect, useRef, useState } from "react";
import { getSpeechLevel, subscribeSpeechLevel } from "@/lib/advisor/voice";
import { cn } from "@/lib/utils";

export type Mood = "idle" | "listen" | "speak" | "think";

function rand() {
  return Math.random();
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/nex/portrait.jpg";
    let alive = true;
    let raf = 0;
    const t0 = performance.now();
    let gazeX = 0;
    let gazeY = 0;
    let blink = 0;
    let nextBlink = 400 + rand() * 1800;
    let blinkUntil = 0;
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
      const dt = 1 / 60;

      gazeX += (-1.1 * gazeX + (rand() - 0.5) * 0.9) * dt;
      gazeY += (-1.3 * gazeY + (rand() - 0.5) * 0.6) * dt;
      if (m === "think") gazeY += 0.12 * dt;
      if (m === "listen") gazeY -= 0.08 * dt;

      if (now > nextBlink && blink <= 0) {
        blink = 1;
        blinkUntil = now + 90 + rand() * 70;
        doublePending = rand() < 0.14;
      }
      if (blink > 0 && now > blinkUntil) {
        blink = 0;
        if (doublePending) {
          doublePending = false;
          nextBlink = now + 80 + rand() * 70;
        } else {
          nextBlink = now + 1600 + Math.pow(rand(), 0.7) * 5200;
        }
      }

      const breathe =
        0.48 * Math.sin(t * 0.73) +
        0.32 * Math.sin(t * 1.19 + 1.7) +
        0.2 * Math.sin(t * 0.21 + 0.4);
      const lift = (m === "think" ? 0.35 : 1) * breathe;
      const scale = 1.04 + lift * 0.012 + (m === "listen" ? 0.008 : 0);
      const ox = gazeX * w * 0.012;
      const oy = (lift * 0.01 + gazeY * 0.01) * h;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2 + ox, h / 2 + oy);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      if (img.complete && img.naturalWidth) {
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
          dy = (h - dh) / 2 - h * 0.04;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      ctx.restore();

      const visorY = h * 0.36;
      const visorPulse =
        0.35 +
        0.2 * Math.sin(t * 2.07 + 0.3) +
        0.15 * Math.sin(t * 0.41) +
        (m === "listen" ? 0.2 : 0) +
        (m === "speak" ? 0.15 + speech * 0.35 : 0);
      const g = ctx.createRadialGradient(w * 0.42, visorY, w * 0.02, w * 0.48, visorY, w * 0.42);
      g.addColorStop(0, `rgba(180, 230, 230, ${0.08 + visorPulse * 0.12})`);
      g.addColorStop(0.45, `rgba(120, 170, 180, ${0.04 + visorPulse * 0.05})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      if (blink > 0) {
        ctx.fillStyle = "rgba(4, 6, 8, 0.72)";
        const lid = h * 0.055;
        ctx.fillRect(0, visorY - lid * 0.2, w, lid * 1.4);
      }

      if (m === "speak" || speech > 0.04) {
        const amp = 0.2 + speech * 0.8;
        const mouthH = h * (0.012 + amp * 0.028);
        ctx.fillStyle = `rgba(8, 10, 12, ${0.18 + amp * 0.22})`;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.62, w * 0.055, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (m === "think") {
        ctx.fillStyle = "rgba(8, 8, 10, 0.16)";
        ctx.fillRect(0, 0, w, h);
      }

      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.2, w * 0.5, h * 0.5, h * 0.78);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(8, 8, 10, 0.28)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
    };
    if (img.complete) start();
    else img.onload = start;

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
    };
  }, [reduce]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative overflow-hidden rounded-lg bg-bg", className)}
    >
      {reduce ? (
        <img
          src="/nex/portrait.jpg"
          alt=""
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          mood === "listen" && "shadow-[inset_0_0_24px_rgba(197,201,209,0.28)]",
          mood === "speak" && "shadow-[inset_0_-18px_28px_rgba(197,201,209,0.18)]",
        )}
      />
      <span className="sr-only">Nex, local research companion</span>
    </div>
  );
}
