import { useEffect, useRef } from "react";
import type { Mood } from "./nex-portrait";

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function NexLife({ mood }: { mood: Mood }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let raf = 0;
    let idle = 0;
    let visible = true;

    const state = {
      open: null as HTMLImageElement | null,
      shut: null as HTMLImageElement | null,
      blink: 0,
      closing: false,
      nextBlink: 1.8,
      t: 0,
    };

    void Promise.all([load("/nex/portrait.jpg"), load("/nex/blink.jpg")]).then(([open, shut]) => {
      if (!alive) return;
      state.open = open;
      state.shut = shut;
    });

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.floor(r.width * dpr));
      canvas.height = Math.max(2, Math.floor(r.height * dpr));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    const io = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    let last = performance.now();
    const draw = (now: number) => {
      if (!alive) return;
      if (!visible) {
        idle = window.setTimeout(() => {
          raf = requestAnimationFrame(draw);
        }, 400);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.t += dt;
      const t = state.t;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const img = state.open;
      if (!img) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const moodNow = moodRef.current;
      if (!reduce) {
        if (state.closing) {
          state.blink += dt / 0.055;
          if (state.blink >= 1) {
            state.blink = 1;
            state.closing = false;
          }
        } else if (state.blink > 0) {
          state.blink -= dt / 0.09;
          if (state.blink <= 0) {
            state.blink = 0;
            state.nextBlink = t + 2.4 + Math.random() * 6;
            if (Math.random() < 0.1) state.nextBlink = t + 0.16;
          }
        } else if (t >= state.nextBlink) {
          state.closing = true;
        }
      }

      const breath = reduce ? 0 : 0.008 * Math.sin(t * 0.7) + 0.003 * Math.sin(t * 0.25);
      const lean = moodNow === "listen" ? 0.005 : moodNow === "think" ? -0.003 : 0;
      const speak = moodNow === "speak" && !reduce ? 0.004 * Math.abs(Math.sin(t * 6.6)) : 0;
      const gx = reduce ? 0 : Math.sin(t * 0.17) * (w * 0.003);
      const gy = reduce ? 0 : Math.sin(t * 0.13) * (h * 0.0025);
      const scale = 1 + breath + lean + speak;

      const s = Math.min(w / img.width, h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      ctx.save();
      ctx.translate(w / 2 + gx, h / 2 + gy);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(img, dx, dy, dw, dh);
      if (state.shut && state.blink > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx + dw * 0.3, dy + dh * 0.29, dw * 0.4, dh * 0.14);
        ctx.clip();
        ctx.globalAlpha = Math.min(1, state.blink);
        ctx.drawImage(state.shut, dx, dy, dw, dh);
        ctx.restore();
      }

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const visorX = dx + dw * 0.47;
      const visorY = dy + dh * 0.355;
      const pulse =
        moodNow === "speak"
          ? 0.18 + 0.22 * Math.abs(Math.sin(t * 6.4))
          : moodNow === "listen"
            ? 0.22 + 0.05 * Math.sin(t * 2)
            : moodNow === "think"
              ? 0.08
              : 0.12 + 0.04 * Math.sin(t * 0.95);
      ctx.beginPath();
      ctx.ellipse(visorX, visorY, dw * 0.13, dh * 0.038, 0, 0, Math.PI * 2);
      ctx.clip();
      const grd = ctx.createRadialGradient(visorX, visorY, dw * 0.01, visorX, visorY, dw * 0.16);
      grd.addColorStop(0, `rgba(214, 232, 234, ${pulse})`);
      grd.addColorStop(0.55, `rgba(160, 196, 200, ${pulse * 0.28})`);
      grd.addColorStop(1, "rgba(160, 196, 200, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(visorX - dw * 0.16, visorY - dh * 0.06, dw * 0.32, dh * 0.12);
      ctx.restore();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
