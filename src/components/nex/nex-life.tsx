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

    let last = performance.now();
    const draw = (now: number) => {
      if (!alive) return;
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
          state.blink += dt / 0.06;
          if (state.blink >= 1) {
            state.blink = 1;
            state.closing = false;
          }
        } else if (state.blink > 0) {
          state.blink -= dt / 0.08;
          if (state.blink <= 0) {
            state.blink = 0;
            state.nextBlink = t + 2.2 + Math.random() * 5.5;
            if (Math.random() < 0.12) state.nextBlink = t + 0.18;
          }
        } else if (t >= state.nextBlink) {
          state.closing = true;
        }
      }

      const breath =
        reduce ? 0 : 0.01 * Math.sin(t * 0.72) + 0.004 * Math.sin(t * 0.27);
      const lean =
        moodNow === "listen" ? 0.006 : moodNow === "think" ? -0.004 : 0;
      const speak =
        moodNow === "speak" && !reduce ? 0.005 * Math.abs(Math.sin(t * 7.4)) : 0;
      const gx = reduce ? 0 : Math.sin(t * 0.19) * (w * 0.004);
      const gy = reduce ? 0 : Math.sin(t * 0.14) * (h * 0.003);
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
        ctx.globalAlpha = Math.min(1, state.blink);
        ctx.drawImage(state.shut, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const visorX = dx + dw * 0.47;
      const visorY = dy + dh * 0.36;
      const pulse =
        moodNow === "speak"
          ? 0.22 + 0.28 * Math.abs(Math.sin(t * 6.8))
          : moodNow === "listen"
            ? 0.28 + 0.06 * Math.sin(t * 2.1)
            : moodNow === "think"
              ? 0.1
              : 0.16 + 0.05 * Math.sin(t * 1.05);
      const grd = ctx.createRadialGradient(visorX, visorY, dw * 0.02, visorX, visorY, dw * 0.18);
      grd.addColorStop(0, `rgba(214, 232, 234, ${pulse})`);
      grd.addColorStop(0.45, `rgba(160, 196, 200, ${pulse * 0.35})`);
      grd.addColorStop(1, "rgba(160, 196, 200, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
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
