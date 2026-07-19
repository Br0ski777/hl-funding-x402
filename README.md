# Hyperliquid Funding Rates API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://hl-funding.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Real-time and historical Hyperliquid funding rates for 229 perp markets. Sort by highest/lowest, find arb opportunities. Zero-cost data. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "hl-funding": {
      "url": "https://hl-funding.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl -X POST "https://hl-funding.api.klymax402.com/api/rates" \
  -H "Content-Type: application/json" \
  -d '{}'
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `hyperliquid_get_funding_rates` | POST | `/api/rates` | $0.005 | Current funding rates for all 229 Hyperliquid perp markets sorted by rate |
| `hyperliquid_get_funding_history` | POST | `/api/history` | $0.005 | Historical funding rate data for a specific Hyperliquid coin |
| `hyperliquid_find_funding_arb` | POST | `/api/arb` | $0.008 | Find funding rate arbitrage opportunities -- coins with extreme positive or negative rates |

### `hyperliquid_get_funding_rates`

Use this when you need current funding rates across all Hyperliquid perpetual markets. Returns real-time funding rate, premium, open interest, and mark price for every listed perp coin on Hyperliquid DEX, sorted by your chosen criteria.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `sort` | string | no | Sort order for funding rates. 'highest' = most positive first (shorts pay longs), 'lowest' = most negative first (longs pay shorts), 'abs' = highest absolute value first (default). |

Example response:

```json
{ totalMarkets: 229, sort: "abs", rates: [{ coin: "BTC", fundingRate: 0.000125, annualizedRate: 13.69, premium: 0.0002, openInterest: 1250000000, markPrice: 68500.5 }, ...] }
```

**When to use**: opening perp positions to check funding cost. Essential for carry trade analysis, market sentiment gauging, and identifying crowded trades.

**Not for**: historical funding data (use `hyperliquid_get_funding_history`), vault performance data (use `hyperliquid_get_vault_details`), whale position tracking (use `hyperliquid_track_whale_positions`).

### `hyperliquid_get_funding_history`

Use this when you need historical funding rate data for a specific Hyperliquid perpetual market. Returns timestamped funding rate entries over a configurable lookback window, plus summary statistics including average, min, max, and standard deviation.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `coin` | string | yes | Coin ticker symbol (e.g. BTC, ETH, SOL, DOGE). Must match a Hyperliquid perp market. |
| `hours` | number | no | Lookback window in hours. Default: 24. Max: 720 (30 days). Each funding period is 8 hours, so 24h returns ~3 entries. |

Example response:

```json
{ coin: "ETH", hours: 24, entries: [{ time: "2026-04-13T08:00:00Z", fundingRate: 0.0001, annualizedRate: 10.95 }, ...], summary: { count: 3, avgRate: 0.00012, avgAnnualized: 13.14, minRate: 0.00008, maxRate: 0.00015, stdDev: 0.000029 } }
```

**Not for**: current rates across all markets (use `hyperliquid_get_funding_rates`), CEX funding rates (use `funding_rates_get_current`).

### `hyperliquid_find_funding_arb`

Use this when you need to find funding rate arbitrage opportunities on Hyperliquid. Scans all 229 perp markets and returns coins where the absolute funding rate exceeds 0.01% per 8h period (annualized > 36%), flagged as long or short opportunities based on rate direction.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `threshold` | number | no | Minimum absolute funding rate to qualify as an arb opportunity. Default: 0.0001 (0.01% per 8h, ~36% annualized). Lower values return more results. |

Example response:

```json
{ threshold: 0.0001, totalOpportunities: 12, longOpportunities: 5, shortOpportunities: 7, opportunities: [{ coin: "PEPE", fundingRate: 0.0005, annualizedRate: 54.75, direction: "short opportunity", openInterest: 85000000, markPrice: 0.0000125, premium: 0.001 }, ...] }
```

**Not for**: historical funding trends (use `hyperliquid_get_funding_history`), DEX swap quotes (use `dex_get_swap_quote`), DeFi yield farming (use `defi_find_best_yields`).

## Example agent prompts

- "Current funding rates across all Hyperliquid perpetual markets"
- "Historical funding rate data for a specific Hyperliquid perpetual market"
- "Find funding rate arbitrage opportunities on Hyperliquid"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
