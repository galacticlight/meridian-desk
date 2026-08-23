# Meridian Desk

Private market laboratory: on-device forecasts, risk cones, and **Nex**, a local educational research companion.

Forecasts run in the browser (GBM, GARCH-t, block bootstrap, AR(1), sequence net, Markov regime, correlated Monte Carlo). Nex answers from an offline library (Investopedia, Fidelity Learning Center, SEC Investor.gov, Vanguard, CFA Institute). Not a broker and not personalized advice.

## Stack

React 19 · TanStack Start · Tailwind v4 · Recharts · Node 22

## Run on a Mac (Apple Silicon)

1. Install **Node.js 22 LTS** from [nodejs.org](https://nodejs.org) — choose the macOS ARM64 installer.
2. Confirm in Terminal:

   ```bash
   node -v
   ```

   You want `v22.x.x`.

3. Clone the desk:

   ```bash
   git clone https://github.com/galacticlight/meridian-desk.git
   cd meridian-desk
   ```

4. Install dependencies (first run only):

   ```bash
   npm install
   ```

5. Start the laboratory:

   ```bash
   npm run dev
   ```

6. Open the address Terminal prints (typically `http://localhost:8080`).
7. Unmute the Mac and click the page once so Nex can greet you as **Operator**. On a Mac, Nex speaks with the system **Samantha** voice (Apple’s natural speech, not the browser). You can change the voice in Nex’s panel. **Voice off** silences the companion.

Safari and Chrome on Apple Silicon both work. Keep Terminal open while you use the desk. Forecasts and Nex’s library run on the machine with no extra keys.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (forecast engine + local advisor) |

## License

Private research tool. Educational use only.
