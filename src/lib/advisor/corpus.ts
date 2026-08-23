export type SourceId =
  | "investopedia"
  | "fidelity"
  | "sec"
  | "vanguard"
  | "cfa";

export type CorpusEntry = {
  id: string;
  title: string;
  source: SourceId;
  sourceLabel: string;
  url: string;
  tags: string[];
  body: string;
};

export const SOURCE_LABEL: Record<SourceId, string> = {
  investopedia: "Investopedia",
  fidelity: "Fidelity Learning Center",
  sec: "SEC Investor.gov",
  vanguard: "Vanguard Principles",
  cfa: "CFA Institute",
};

export const SOURCES: { id: SourceId; label: string; url: string }[] = [
  { id: "investopedia", label: "Investopedia", url: "https://www.investopedia.com" },
  {
    id: "fidelity",
    label: "Fidelity Learning Center",
    url: "https://www.fidelity.com/learning-center/overview",
  },
  { id: "sec", label: "SEC Investor.gov", url: "https://www.investor.gov/" },
  {
    id: "vanguard",
    label: "Vanguard Principles",
    url: "https://corporate.vanguard.com/content/corporatesite/us/en/corp/about-our-funds/how-we-invest/principles-for-investing-success.html",
  },
  {
    id: "cfa",
    label: "CFA Institute",
    url: "https://www.cfainstitute.org/insights",
  },
];

export const CORPUS: CorpusEntry[] = [
  {
    id: "what-is-investing",
    title: "Saving versus investing",
    source: "sec",
    sourceLabel: "SEC Investor.gov",
    url: "https://www.investor.gov/introduction-investing",
    tags: ["investing", "saving", "compound", "goals", "basics"],
    body: "Investing means putting money into assets such as stocks or bonds with the expectation of a return over time, either from price appreciation or from interest and dividends. Compound growth happens when you earn a return on both the original capital and on prior returns. The SEC emphasizes defining goals and regularly setting money aside. Returns are not guaranteed; principal can decline.",
  },
  {
    id: "asset-allocation",
    title: "Asset allocation",
    source: "fidelity",
    sourceLabel: "Fidelity Learning Center",
    url: "https://www.fidelity.com/learning-center/trading-investing/asset-allocation",
    tags: ["allocation", "stocks", "bonds", "cash", "risk", "horizon"],
    body: "Asset allocation is the mix of major categories — typically stocks, bonds, and cash. Fidelity describes it as one of the most important long-term decisions: the mix should match the return you need and the risk you can bear. A longer horizon can usually support a higher equity share. Diversification and allocation do not guarantee a profit or protect against loss.",
  },
  {
    id: "diversification",
    title: "Diversification",
    source: "sec",
    sourceLabel: "SEC Investor.gov",
    url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/diversification",
    tags: ["diversification", "risk", "portfolio", "correlation"],
    body: "Diversification spreads money among investments so that weakness in one holding may be offset by others. It reduces idiosyncratic risk, not market risk. A concentrated single-stock position can dominate outcomes even if the rest of the book is diversified on paper. Rebalancing keeps the intended mix from drifting after large moves.",
  },
  {
    id: "allocation-guide",
    title: "Allocation, diversification, and rebalancing",
    source: "sec",
    sourceLabel: "SEC Investor.gov",
    url: "https://www.investor.gov/additional-resources/general-resources/publications-research/info-sheets/beginners-guide-asset",
    tags: ["rebalancing", "allocation", "reward", "risk"],
    body: "The SEC beginner guide treats asset allocation, diversification, and rebalancing as the core operating system of a portfolio. Risk and reward are linked: higher expected return generally requires accepting larger drawdowns. Rebalancing is the mechanical act of selling what has grown too large and buying what has lagged, restoring the plan rather than chasing last year's winner.",
  },
  {
    id: "vanguard-four",
    title: "Four principles for investing success",
    source: "vanguard",
    sourceLabel: "Vanguard",
    url: "https://corporate.vanguard.com/content/corporatesite/us/en/corp/about-our-funds/how-we-invest/principles-for-investing-success.html",
    tags: ["goals", "balance", "cost", "discipline", "index", "long-term"],
    body: "Vanguard's four principles: (1) Goals — write clear, appropriate objectives. (2) Balance — a diversified mix matched to those goals. (3) Cost — minimize fees, because costs compound against you. (4) Discipline — stay with the plan through noise. Focus on what you can control: savings rate, allocation, costs, and behavior. Market timing is not in that set.",
  },
  {
    id: "cfa-ethics",
    title: "Process over prediction",
    source: "cfa",
    sourceLabel: "CFA Institute",
    url: "https://www.cfainstitute.org/insights",
    tags: ["ethics", "process", "fiduciary", "suitability", "horizon", "advice"],
    body: "CFA Institute education stresses a repeatable process: objectives, constraints, allocation, implementation, and review. Suitability comes before sophistication. A model that produces a pretty path is not a recommendation. Charterholder standards require putting the client's interest first; this desk is educational and cannot know your tax lot, liabilities, or time horizon.",
  },
  {
    id: "cfa-risk",
    title: "Risk is more than volatility",
    source: "cfa",
    sourceLabel: "CFA Institute",
    url: "https://www.cfainstitute.org/insights/professional-learning/refresher-readings",
    tags: ["risk", "liquidity", "drawdown", "horizon", "capacity"],
    body: "Professional curriculum treats risk as several things at once: volatility, drawdown, liquidity, inflation, and the chance you abandon the plan at the worst moment. Realized vol and VaR on this desk measure only the first of those. Capacity — what your plan can survive — matters more than how a chart makes you feel on a quiet Tuesday.",
  },
  {
    id: "compound-risk",
    title: "Compounding does not prevent loss",
    source: "fidelity",
    sourceLabel: "Fidelity Learning Center",
    url: "https://www.fidelity.com/learning-center/smart-money/investing-basics",
    tags: ["compound", "risk", "loss", "return"],
    body: "Fidelity notes that compounding illustrations often assume a smooth rate of return. Real markets are lumpy. A sequence of negative years early in withdrawal can matter more than the average. Potential for a 7% long-run return comes with the risk of large interim declines. Never treat a backtest average as a promise.",
  },
  {
    id: "how-to-start",
    title: "How to start",
    source: "fidelity",
    sourceLabel: "Fidelity Learning Center",
    url: "https://www.fidelity.com/viewpoints/personal-finance/how-to-start-investing",
    tags: ["beginner", "etf", "mutual fund", "401k", "ira", "target date"],
    body: "There is no secret stock. Most people are well served by a broad mix of stocks and bonds, with more stocks when the goal is far away. Building blocks: low-cost mutual funds or ETFs, or a single all-in-one / target-date fund inside a 401(k) or IRA. DIY stock picking takes time and still may not beat a bland index.",
  },
  {
    id: "fraud",
    title: "Red flags of fraud",
    source: "sec",
    sourceLabel: "SEC Investor.gov",
    url: "https://www.investor.gov/",
    tags: ["scam", "fraud", "risk", "returns", "pressure", "crypto"],
    body: "SEC red flags: promises of high returns with little or no risk; pressure to act now; FOMO; fake testimonials; promises of great wealth; unusual payment methods. Be wary of opportunities you did not seek out. If someone guarantees an outcome on a volatile asset, treat that as a warning, not a gift.",
  },
  {
    id: "valuation-limits",
    title: "What forecasts can and cannot do",
    source: "investopedia",
    sourceLabel: "Investopedia",
    url: "https://www.investopedia.com/terms/e/efficientmarkethypothesis.asp",
    tags: ["forecast", "prediction", "emh", "random walk", "model", "monte carlo"],
    body: "Price paths are noisy. Models such as geometric Brownian motion, GARCH, ARIMA, and small neural nets describe plausible distributions, not destiny. Even sophisticated LSTM studies often show directional accuracy near a coin flip out of sample. Use bands (5th–95th percentile), not a single target. A forecast is a risk map: it tells you how wide the cone of uncertainty is given recent volatility.",
  },
  {
    id: "gbm",
    title: "Geometric Brownian motion",
    source: "investopedia",
    sourceLabel: "Investopedia",
    url: "https://www.investopedia.com/terms/g/geometricbrownianmotion.asp",
    tags: ["gbm", "monte carlo", "volatility", "drift", "simulation"],
    body: "GBM assumes log-prices follow a random walk with drift μ and volatility σ. The closed-form step is S * exp((μ − σ²/2)Δt + σ√Δt Z). It is the workhorse behind Black–Scholes and Monte Carlo risk. Weaknesses: constant σ, no jumps, no regime shifts. Pair it with historical bootstrap and a GARCH or Markov regime scaler when you want a more honest cone.",
  },
  {
    id: "garch",
    title: "GARCH and clustered volatility",
    source: "investopedia",
    sourceLabel: "Investopedia",
    url: "https://www.investopedia.com/terms/g/garch.asp",
    tags: ["garch", "volatility", "clustering", "fat tails", "var"],
    body: "GARCH models let today's variance depend on yesterday's shock and yesterday's variance. That captures volatility clustering: quiet days follow quiet days; storms follow storms. Combined with Student-t shocks it produces fatter tails than plain GBM, which is why this desk uses GARCH-t for a more conservative cone of risk.",
  },
  {
    id: "rsi-macd",
    title: "Technical indicators as context, not oracles",
    source: "investopedia",
    sourceLabel: "Investopedia",
    url: "https://www.investopedia.com/terms/r/rsi.asp",
    tags: ["rsi", "macd", "sma", "bollinger", "technical"],
    body: "RSI, MACD, moving averages, and Bollinger bands summarize recent price behavior. They do not know the future. Overbought RSI can stay overbought in a trend. Use them as a second opinion on whether the tape is stretched, then size risk accordingly. They are not a substitute for allocation and costs.",
  },
  {
    id: "risk-metrics",
    title: "Drawdown, VaR, and Sharpe",
    source: "investopedia",
    sourceLabel: "Investopedia",
    url: "https://www.investopedia.com/terms/s/sharperatio.asp",
    tags: ["sharpe", "var", "cvar", "drawdown", "risk", "ewma"],
    body: "Max drawdown is the worst peak-to-trough loss on the path you actually lived. Value at Risk (VaR) is a quantile of the return distribution; CVaR averages the tail beyond that quantile. EWMA volatility (RiskMetrics λ=0.94) weights recent moves more than old ones. Sharpe is excess return per unit of volatility — useful for comparing streams, not for picking a single name.",
  },
  {
    id: "costs",
    title: "Fees compound against you",
    source: "vanguard",
    sourceLabel: "Vanguard",
    url: "https://investor.vanguard.com/investor-resources-education/article/four-timeless-principles-for-investing-success",
    tags: ["fees", "expense ratio", "cost", "index"],
    body: "A 1% annual fee on a long horizon is not a rounding error; it is a large share of expected excess return. Prefer low expense ratios, low turnover, and few transactions. The three-fund and target-date designs exist partly to keep costs and complexity down. Paying more only makes sense when you can identify a durable edge after fees — which most active books do not.",
  },
  {
    id: "horizon",
    title: "Time horizon and risk capacity",
    source: "fidelity",
    sourceLabel: "Fidelity Learning Center",
    url: "https://www.fidelity.com/learning-center/personal-finance/risk-tolerance-time-horizon",
    tags: ["horizon", "tolerance", "capacity", "age", "retirement"],
    body: "Risk tolerance is how it feels. Risk capacity is what your plan can survive. A 30-year saver can usually hold more equities than someone spending in two years, even if both hate losses. Match the equity share to the date you need the money, then stop tinkering when headlines arrive.",
  },
  {
    id: "not-advice",
    title: "Educational use only",
    source: "sec",
    sourceLabel: "SEC Investor.gov",
    url: "https://www.investor.gov/introduction-investing",
    tags: ["advice", "disclaimer", "fiduciary", "advisor"],
    body: "This desk and Nex are research tools. They are not a broker, not a registered investment adviser, and not a substitute for a fiduciary who knows your tax lot, liabilities, and constraints. Past paths — live or simulated — do not guarantee future results. If you need a personal recommendation, speak with a licensed professional.",
  },
];

const STOP = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "what",
  "how",
  "are",
  "you",
  "about",
]);

export function searchCorpus(query: string, k = 5) {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const terms = q.split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
  const phrase = q.trim();
  const scored = CORPUS.map((entry) => {
    const hay = `${entry.title} ${entry.tags.join(" ")} ${entry.body}`.toLowerCase();
    let score = 0;
    if (phrase.length > 6 && hay.includes(phrase)) score += 8;
    for (const t of terms) {
      if (hay.includes(t)) score += 2;
      if (entry.tags.some((tag) => tag.includes(t) || t.includes(tag))) score += 3;
      if (entry.title.toLowerCase().includes(t)) score += 4;
    }
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.entry);
}
