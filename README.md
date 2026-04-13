# Hyperliquid Funding Rates API

Real-time and historical funding rate data for all 229 Hyperliquid perpetual markets. Sort by rate, pull history, and find arbitrage opportunities -- all via a single x402-powered API.

## What It Does / Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/rates` | POST | $0.002 | Current funding rates for all 229 perp markets, sorted by rate |
| `/api/history` | POST | $0.002 | Historical funding rate data for a specific coin |
| `/api/arb` | POST | $0.003 | Find funding rate arbitrage opportunities (extreme rates) |

## Example Request/Response

### GET /
```json
{
  "api": "Hyperliquid Funding Rates API",
  "status": "online",
  "protocol": "x402",
  "network": "base-mainnet"
}
```

### POST /api/rates
**Request:**
```json
{ "sort": "abs" }
```
**Response:**
```json
{
  "totalMarkets": 229,
  "sort": "abs",
  "timestamp": "2026-04-13T12:00:00.000Z",
  "rates": [
    {
      "coin": "PEPE",
      "fundingRate": 0.0005,
      "annualizedRate": 54.75,
      "premium": 0.001,
      "openInterest": 85000000,
      "markPrice": 0.0000125
    },
    {
      "coin": "BTC",
      "fundingRate": 0.000125,
      "annualizedRate": 13.69,
      "premium": 0.0002,
      "openInterest": 1250000000,
      "markPrice": 68500.5
    }
  ]
}
```

### POST /api/history
**Request:**
```json
{ "coin": "ETH", "hours": 24 }
```
**Response:**
```json
{
  "coin": "ETH",
  "hours": 24,
  "timestamp": "2026-04-13T12:00:00.000Z",
  "entries": [
    { "time": "2026-04-13T08:00:00.000Z", "fundingRate": 0.0001, "annualizedRate": 10.95 },
    { "time": "2026-04-13T00:00:00.000Z", "fundingRate": 0.00012, "annualizedRate": 13.14 },
    { "time": "2026-04-12T16:00:00.000Z", "fundingRate": 0.00008, "annualizedRate": 8.76 }
  ],
  "summary": {
    "count": 3,
    "avgRate": 0.0001,
    "avgAnnualized": 10.95,
    "minRate": 0.00008,
    "maxRate": 0.00012,
    "stdDev": 0.00001633
  }
}
```

### POST /api/arb
**Request:**
```json
{ "threshold": 0.0001 }
```
**Response:**
```json
{
  "threshold": 0.0001,
  "totalOpportunities": 12,
  "longOpportunities": 5,
  "shortOpportunities": 7,
  "timestamp": "2026-04-13T12:00:00.000Z",
  "opportunities": [
    {
      "coin": "PEPE",
      "fundingRate": 0.0005,
      "annualizedRate": 54.75,
      "direction": "short opportunity",
      "openInterest": 85000000,
      "markPrice": 0.0000125,
      "premium": 0.001
    }
  ]
}
```

## Use Cases

- **Carry Trade Analysis** -- Find coins where you earn funding by taking the opposite side of crowded trades
- **Market Sentiment** -- High positive funding = market is overly long; high negative = overly short
- **Delta-Neutral Strategies** -- Combine spot + perp positions to harvest funding without directional risk
- **Backtesting** -- Use historical funding data to validate funding-based trading strategies
- **Cross-Exchange Arb** -- Compare Hyperliquid funding with CEX rates to find cross-venue opportunities

## MCP Integration

### Claude Desktop / Cursor
```json
{
  "mcpServers": {
    "hl-funding": {
      "url": "https://PLACEHOLDER.up.railway.app/sse"
    }
  }
}
```

### Smithery
```bash
smithery mcp install axel-belfort/hl-funding
```

## Payment

All endpoints are gated by x402 protocol. Agents pay automatically with USDC on Base L2 -- no API keys, no accounts, no subscriptions. Just send a request and the payment is settled in under 2 seconds.

## Related APIs

- [hyperliquid-data](https://github.com/Br0ski777/hyperliquid-data-x402) -- Full market data (orderbook, trades, candles)
- [hl-vaults](https://github.com/Br0ski777/hl-vaults-x402) -- Hyperliquid vault performance and details
- [hyperliquid-whales](https://github.com/Br0ski777/hyperliquid-whales-x402) -- Track whale positions and large trades
- [funding-rates](https://github.com/Br0ski777/funding-rates-x402) -- Multi-exchange funding rate comparison
- [funding-arb](https://github.com/Br0ski777/funding-arb-x402) -- Cross-exchange funding arbitrage scanner
