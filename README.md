# Meridian Desk

Private market laboratory: on-device forecasts, risk cones, and **Nex**, a local educational research companion.

Forecasts run in the browser (GBM, GARCH-t, block bootstrap, AR(1), sequence net, Markov regime, correlated Monte Carlo). Nex answers from an offline library (Investopedia, Fidelity Learning Center, SEC Investor.gov, Vanguard, CFA Institute). Not a broker and not personalized advice.

## Stack

React 19 · TanStack Start · Tailwind v4 · Recharts

## Local development

```bash
npm install
npm run dev
```

The app listens on port 8080.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (forecast engine + local advisor) |

## License

Private research tool. Educational use only.
