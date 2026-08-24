import { useEffect, useRef } from "react";

type Mood = "idle" | "listen" | "speak" | "think";

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform float u_amp;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec2 scar(float t) {
  vec2 a = vec2(0.452, 0.348);
  vec2 b = vec2(0.490, 0.430);
  vec2 c = vec2(0.430, 0.530);
  vec2 d = vec2(0.470, 0.655);
  float u = 1.0 - t;
  return u*u*u*a + 3.0*u*u*t*b + 3.0*u*t*t*c + t*t*t*d;
}

vec2 displace(vec2 p, float t, float time, float amt) {
  vec2 q = scar(clamp(t + 0.03, 0.0, 1.0)) - scar(clamp(t - 0.03, 0.0, 1.0));
  vec2 nrm = length(q) > 0.0001 ? normalize(q) : vec2(0.0, 1.0);
  vec2 perp = vec2(-nrm.y, nrm.x);
  float n = fbm(vec2(t * 6.5, time * 0.22)) - 0.5;
  float n2 = fbm(vec2(t * 14.0, time * 0.51 + 3.1)) - 0.5;
  return p + perp * (n * amt + n2 * amt * 0.35);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  uv.y = 1.0 - uv.y;
  float time = u_time;

  float md = 10.0;
  float mt = 0.0;
  float spine = 10.0;
  for (int i = 0; i < 28; i++) {
    float t = float(i) / 27.0;
    vec2 s = scar(t);
    spine = min(spine, length(uv - s));
    vec2 p = displace(s, t, time, 0.024);
    float d = length(uv - p);
    if (d < md) {
      md = d;
      mt = t;
    }
  }

  float branch = 10.0;
  vec2 root = displace(scar(0.38), 0.38, time, 0.02);
  vec2 dir = normalize(vec2(-0.35, 0.72));
  for (int j = 0; j < 10; j++) {
    float t = float(j) / 9.0;
    vec2 p = root + dir * t * 0.07;
    p.x += (fbm(vec2(t * 9.0, time * 0.4 + 8.0)) - 0.5) * 0.03;
    branch = min(branch, length(uv - p));
  }

  float core = smoothstep(0.010, 0.0012, md);
  float glow = smoothstep(0.055, 0.0, md);
  float halo = smoothstep(0.11, 0.0, md);
  float br = smoothstep(0.008, 0.001, branch) * 0.45 + smoothstep(0.03, 0.0, branch) * 0.12;

  float travel = 0.55 + 0.45 * smoothstep(0.22, 0.0, abs(fract(mt - time * 0.07) - 0.08));
  float flicker = 0.82 + 0.18 * noise(vec2(time * 2.3, 0.4));
  float pulse = 0.18 + 0.22 * (0.5 + 0.5 * sin(time * 1.05));
  float cheek = exp(-spine * spine * 42.0) * pulse;

  vec3 teal = vec3(0.72, 0.93, 0.95);
  vec3 hot = vec3(0.92, 0.98, 1.0);
  float k = u_amp * flicker;
  vec3 col = teal * (cheek * 0.55 + halo * 0.22 * k);
  col += teal * glow * 0.55 * k * travel;
  col += hot * core * k * travel;
  col += teal * br * k * 0.65;

  float gate = smoothstep(0.22, 0.05, spine);
  col *= gate;

  float alpha = max(col.r, max(col.g, col.b));
  gl_FragColor = vec4(col, alpha * 0.92);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

const AMP: Record<Mood, number> = {
  idle: 0.62,
  listen: 0.78,
  speak: 0.95,
  think: 0.38,
};

export function LightningGL({ mood }: { mood: Mood }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uAmp = gl.getUniformLocation(prog, "u_amp");

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.floor(r.width * dpr));
      canvas.height = Math.max(2, Math.floor(r.height * dpr));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const t0 = performance.now();
    let raf = 0;
    let alive = true;
    const draw = (now: number) => {
      if (!alive) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uAmp, AMP[moodRef.current]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
      aria-hidden="true"
    />
  );
}
