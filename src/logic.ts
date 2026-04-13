import type { Hono } from "hono";

// ─── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000; // 60 seconds

function cached<T>(key: string): T | null {
  const e = cache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL ? (e.data as T) : null;
}
function setCache(key: string, data: any) { cache.set(key, { data, ts: Date.now() }); }

// ─── Hyperliquid API ───────────────────────────────────────────────────────

const HL_API = "https://api.hyperliquid.xyz/info";

async function hlPost(body: Record<string, any>): Promise<any> {
  const res = await fetch(HL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Data types ────────────────────────────────────────────────────────────

interface MarketRate {
  coin: string;
  fundingRate: number;
  annualizedRate: number;
  premium: number;
  openInterest: number;
  markPrice: number;
}

interface FundingEntry {
  time: string;
  fundingRate: number;
  annualizedRate: number;
}

// ─── Fetch all funding rates ───────────────────────────────────────────────

async function fetchAllRates(): Promise<MarketRate[]> {
  const hit = cached<MarketRate[]>("allRates");
  if (hit) return hit;

  const data = await hlPost({ type: "metaAndAssetCtxs" });
  // data = [meta, assetCtxs[]]
  // meta.universe = [{ name: "BTC", ... }, ...]
  // assetCtxs = [{ funding, premium, openInterest, markPx, ... }, ...]
  const meta = data[0];
  const ctxs = data[1];
  const universe = meta.universe;

  const rates: MarketRate[] = [];
  for (let i = 0; i < universe.length; i++) {
    const coin = universe[i].name;
    const ctx = ctxs[i];
    if (!ctx) continue;

    const fundingRate = parseFloat(ctx.funding || "0");
    const premium = parseFloat(ctx.premium || "0");
    const openInterest = parseFloat(ctx.openInterest || "0");
    const markPrice = parseFloat(ctx.markPx || "0");
    const annualizedRate = fundingRate * 3 * 365 * 100; // 3 periods/day * 365 days * 100 for %

    rates.push({
      coin,
      fundingRate,
      annualizedRate: Math.round(annualizedRate * 100) / 100,
      premium,
      openInterest: Math.round(openInterest * markPrice), // convert from coins to USD
      markPrice,
    });
  }

  setCache("allRates", rates);
  return rates;
}

// ─── Fetch funding history ─────────────────────────────────────────────────

async function fetchFundingHistory(coin: string, hours: number): Promise<FundingEntry[]> {
  const cacheKey = `history:${coin}:${hours}`;
  const hit = cached<FundingEntry[]>(cacheKey);
  if (hit) return hit;

  const startTime = Date.now() - hours * 60 * 60 * 1000;
  const data = await hlPost({
    type: "fundingHistory",
    coin: coin.toUpperCase(),
    startTime,
  });

  // data = [{ coin, fundingRate, premium, time }, ...]
  const entries: FundingEntry[] = (data || []).map((entry: any) => {
    const rate = parseFloat(entry.fundingRate || "0");
    return {
      time: new Date(entry.time).toISOString(),
      fundingRate: rate,
      annualizedRate: Math.round(rate * 3 * 365 * 100 * 100) / 100,
    };
  });

  setCache(cacheKey, entries);
  return entries;
}

// ─── Routes ────────────────────────────────────────────────────────────────

export function registerRoutes(app: Hono) {

  // POST /api/rates — Current funding rates for all markets
  app.post("/api/rates", async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const sort = (body as any).sort || "abs";

      const rates = await fetchAllRates();

      // Sort
      let sorted: MarketRate[];
      if (sort === "highest") {
        sorted = [...rates].sort((a, b) => b.fundingRate - a.fundingRate);
      } else if (sort === "lowest") {
        sorted = [...rates].sort((a, b) => a.fundingRate - b.fundingRate);
      } else {
        // abs — highest absolute value first
        sorted = [...rates].sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
      }

      return c.json({
        totalMarkets: sorted.length,
        sort,
        timestamp: new Date().toISOString(),
        rates: sorted,
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // POST /api/history — Historical funding for a specific coin
  app.post("/api/history", async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const coin = ((body as any).coin || "").toUpperCase();
      const hours = Math.min(Math.max((body as any).hours || 24, 1), 720);

      if (!coin) {
        return c.json({ error: "Missing required parameter: coin (e.g. BTC, ETH, SOL)" }, 400);
      }

      const entries = await fetchFundingHistory(coin, hours);

      // Summary stats
      const rates = entries.map((e) => e.fundingRate);
      const count = rates.length;
      const avgRate = count > 0 ? rates.reduce((a, b) => a + b, 0) / count : 0;
      const avgAnnualized = Math.round(avgRate * 3 * 365 * 100 * 100) / 100;
      const minRate = count > 0 ? Math.min(...rates) : 0;
      const maxRate = count > 0 ? Math.max(...rates) : 0;
      const variance = count > 0 ? rates.reduce((sum, r) => sum + (r - avgRate) ** 2, 0) / count : 0;
      const stdDev = Math.sqrt(variance);

      return c.json({
        coin,
        hours,
        timestamp: new Date().toISOString(),
        entries,
        summary: {
          count,
          avgRate: Math.round(avgRate * 1e8) / 1e8,
          avgAnnualized,
          minRate,
          maxRate,
          stdDev: Math.round(stdDev * 1e8) / 1e8,
        },
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // POST /api/arb — Find funding arbitrage opportunities
  app.post("/api/arb", async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const threshold = (body as any).threshold || 0.0001; // 0.01% per 8h

      const rates = await fetchAllRates();

      const opportunities = rates
        .filter((r) => Math.abs(r.fundingRate) > threshold)
        .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
        .map((r) => ({
          coin: r.coin,
          fundingRate: r.fundingRate,
          annualizedRate: r.annualizedRate,
          direction: r.fundingRate < 0 ? "long opportunity" : "short opportunity",
          openInterest: r.openInterest,
          markPrice: r.markPrice,
          premium: r.premium,
        }));

      const longOpps = opportunities.filter((o) => o.direction === "long opportunity").length;
      const shortOpps = opportunities.filter((o) => o.direction === "short opportunity").length;

      return c.json({
        threshold,
        totalOpportunities: opportunities.length,
        longOpportunities: longOpps,
        shortOpportunities: shortOpps,
        timestamp: new Date().toISOString(),
        opportunities,
      });
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });
}
