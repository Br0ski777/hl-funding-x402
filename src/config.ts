import type { ApiConfig } from "./shared.ts";

export const API_CONFIG: ApiConfig = {
  name: "Hyperliquid Funding Rates API",
  slug: "hl-funding",
  description: "Real-time and historical Hyperliquid funding rates for 229 perp markets. Sort by highest/lowest, find arb opportunities. Zero-cost data.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/rates",
      price: "$0.002",
      description: "Current funding rates for all 229 Hyperliquid perp markets sorted by rate",
      toolName: "hyperliquid_get_funding_rates",
      toolDescription:
        `Use this when you need current funding rates across all Hyperliquid perpetual markets. Returns real-time funding rate, premium, open interest, and mark price for every listed perp coin on Hyperliquid DEX, sorted by your chosen criteria.

Data returned for each market:
1. coin: ticker symbol (e.g. BTC, ETH, SOL, DOGE)
2. fundingRate: current 8-hour funding rate as a decimal (e.g. 0.0001 = 0.01%)
3. annualizedRate: funding rate annualized (rate * 3 * 365) as a percentage
4. premium: mark-oracle price premium as a decimal
5. openInterest: total open interest in USD
6. markPrice: current mark price in USD

Example output: { totalMarkets: 229, sort: "abs", rates: [{ coin: "BTC", fundingRate: 0.000125, annualizedRate: 13.69, premium: 0.0002, openInterest: 1250000000, markPrice: 68500.5 }, ...] }

Use this BEFORE opening perp positions to check funding cost. Essential for carry trade analysis, market sentiment gauging, and identifying crowded trades.

Do NOT use for historical funding data -- use hyperliquid_get_funding_history instead. Do NOT use for vault performance data -- use hyperliquid_get_vault_details instead. Do NOT use for whale position tracking -- use hyperliquid_track_whale_positions instead.`,
      inputSchema: {
        type: "object",
        properties: {
          sort: {
            type: "string",
            enum: ["highest", "lowest", "abs"],
            description: "Sort order for funding rates. 'highest' = most positive first (shorts pay longs), 'lowest' = most negative first (longs pay shorts), 'abs' = highest absolute value first (default).",
          },
        },
        required: [],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "totalMarkets": {
              "type": "number",
              "description": "Total perp markets"
            },
            "sort": {
              "type": "string",
              "description": "Sort order used"
            },
            "timestamp": {
              "type": "string"
            },
            "rates": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "coin": {
                    "type": "string"
                  },
                  "fundingRate": {
                    "type": "number"
                  },
                  "annualizedRate": {
                    "type": "number"
                  },
                  "premium": {
                    "type": "number"
                  },
                  "openInterest": {
                    "type": "number"
                  },
                  "markPrice": {
                    "type": "number"
                  }
                }
              }
            }
          },
          "required": [
            "totalMarkets",
            "rates"
          ]
        },
    },
    {
      method: "POST",
      path: "/api/history",
      price: "$0.002",
      description: "Historical funding rate data for a specific Hyperliquid coin",
      toolName: "hyperliquid_get_funding_history",
      toolDescription:
        `Use this when you need historical funding rate data for a specific Hyperliquid perpetual market. Returns timestamped funding rate entries over a configurable lookback window, plus summary statistics including average, min, max, and standard deviation.

Data returned:
1. coin: the queried ticker symbol (e.g. BTC, ETH, SOL)
2. hours: lookback period requested (default 24)
3. entries: array of { time (ISO 8601), fundingRate (decimal), annualizedRate (%) }
4. summary.count: number of funding periods in the window
5. summary.avgRate: average funding rate over the period
6. summary.avgAnnualized: average annualized rate (%)
7. summary.minRate / maxRate: extremes observed in the window
8. summary.stdDev: standard deviation of rates (volatility of funding)

Example output: { coin: "ETH", hours: 24, entries: [{ time: "2026-04-13T08:00:00Z", fundingRate: 0.0001, annualizedRate: 10.95 }, ...], summary: { count: 3, avgRate: 0.00012, avgAnnualized: 13.14, minRate: 0.00008, maxRate: 0.00015, stdDev: 0.000029 } }

Use this to analyze funding trends before entering a carry trade or to backtest funding-based strategies over recent periods.

Do NOT use for current rates across all markets -- use hyperliquid_get_funding_rates instead. Do NOT use for on-chain wallet analysis -- use wallet_get_portfolio instead. Do NOT use for CEX funding rates -- use funding_rates_get_current instead.`,
      inputSchema: {
        type: "object",
        properties: {
          coin: {
            type: "string",
            description: "Coin ticker symbol (e.g. BTC, ETH, SOL, DOGE). Must match a Hyperliquid perp market.",
          },
          hours: {
            type: "number",
            description: "Lookback window in hours. Default: 24. Max: 720 (30 days). Each funding period is 8 hours, so 24h returns ~3 entries.",
          },
        },
        required: ["coin"],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "coin": {
              "type": "string",
              "description": "Coin queried"
            },
            "hours": {
              "type": "number",
              "description": "Lookback period"
            },
            "timestamp": {
              "type": "string"
            },
            "entries": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "time": {
                    "type": "string"
                  },
                  "fundingRate": {
                    "type": "number"
                  },
                  "annualizedRate": {
                    "type": "number"
                  }
                }
              }
            },
            "summary": {
              "type": "object",
              "properties": {
                "count": {
                  "type": "number"
                },
                "avgRate": {
                  "type": "number"
                },
                "avgAnnualized": {
                  "type": "number"
                },
                "minRate": {
                  "type": "number"
                },
                "maxRate": {
                  "type": "number"
                },
                "stdDev": {
                  "type": "number"
                }
              }
            }
          },
          "required": [
            "coin",
            "entries",
            "summary"
          ]
        },
    },
    {
      method: "POST",
      path: "/api/arb",
      price: "$0.003",
      description: "Find funding rate arbitrage opportunities -- coins with extreme positive or negative rates",
      toolName: "hyperliquid_find_funding_arb",
      toolDescription:
        `Use this when you need to find funding rate arbitrage opportunities on Hyperliquid. Scans all 229 perp markets and returns coins where the absolute funding rate exceeds 0.01% per 8h period (annualized > 36%), flagged as long or short opportunities based on rate direction.

Data returned for each opportunity:
1. coin: ticker symbol with extreme funding
2. fundingRate: current 8-hour rate as decimal
3. annualizedRate: annualized percentage (rate * 3 * 365)
4. direction: "long opportunity" (negative rate = longs get paid) or "short opportunity" (positive rate = shorts get paid)
5. openInterest: total OI in USD (liquidity indicator)
6. markPrice: current mark price in USD
7. premium: mark-oracle price premium

Example output: { threshold: 0.0001, totalOpportunities: 12, longOpportunities: 5, shortOpportunities: 7, opportunities: [{ coin: "PEPE", fundingRate: 0.0005, annualizedRate: 54.75, direction: "short opportunity", openInterest: 85000000, markPrice: 0.0000125, premium: 0.001 }, ...] }

Use this to identify carry trade setups where you earn funding by taking the opposite side of a crowded trade. Combine with spot hedging for delta-neutral strategies.

Do NOT use for historical funding trends -- use hyperliquid_get_funding_history instead. Do NOT use for DEX swap quotes -- use dex_get_swap_quote instead. Do NOT use for DeFi yield farming -- use defi_find_best_yields instead.`,
      inputSchema: {
        type: "object",
        properties: {
          threshold: {
            type: "number",
            description: "Minimum absolute funding rate to qualify as an arb opportunity. Default: 0.0001 (0.01% per 8h, ~36% annualized). Lower values return more results.",
          },
        },
        required: [],
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "threshold": {
              "type": "number",
              "description": "Min rate threshold used"
            },
            "totalOpportunities": {
              "type": "number"
            },
            "longOpportunities": {
              "type": "number"
            },
            "shortOpportunities": {
              "type": "number"
            },
            "opportunities": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "coin": {
                    "type": "string"
                  },
                  "fundingRate": {
                    "type": "number"
                  },
                  "annualizedRate": {
                    "type": "number"
                  },
                  "direction": {
                    "type": "string"
                  },
                  "openInterest": {
                    "type": "number"
                  },
                  "markPrice": {
                    "type": "number"
                  }
                }
              }
            }
          },
          "required": [
            "totalOpportunities",
            "opportunities"
          ]
        },
    },
  ],
};
