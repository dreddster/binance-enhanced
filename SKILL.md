---
name: binance-enhanced
description: Full-featured Binance CLI — spot trading, swaps, portfolio tracking, futures, and more. Built for AI agents.
metadata: {"clawdbot":{"emoji":"💛","always":true,"requires":{"bins":["node"]}}}
---

# Binance Enhanced 💛

> **The Binance skill that actually works.** Full Node.js CLI with intelligent swap routing, safety previews, and proper error handling.

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Portfolio    📈 Spot Trading    🔄 Smart Swap           │
│  💹 Futures      📜 History         💰 Deposits             │
└─────────────────────────────────────────────────────────────┘
```

## ✨ What Makes This Enhanced?

| Feature | Basic Skills | This Skill |
|---------|-------------|------------|
| Interface | Copy-paste curl snippets | Real CLI commands |
| Pair Trading | Only */USDT pairs | Any pair with `--for` |
| Swap Routing | Manual multi-step | Auto-routes via USDT |
| Safety | Execute immediately | Preview → Confirm flow |
| Output | Raw API responses | Clean formatted JSON |

---

## 🚀 Quick Start

```bash
# 1. Set your API keys
export BINANCE_API_KEY="your_key"
export BINANCE_SECRET="your_secret"

# 2. Check your portfolio
node scripts/binance.mjs portfolio

# 3. Get a price
node scripts/binance.mjs price BTC

# 4. Make a swap (preview first!)
node scripts/binance.mjs swap ETH USDC 0.05          # Preview
node scripts/binance.mjs swap ETH USDC 0.05 --confirm  # Execute
```

### Example Output

```json
{
  "totalUSD": "$1,234.56",
  "assets": [
    { "asset": "BTC", "total": 0.015, "usdValue": "$890.00" },
    { "asset": "ETH", "total": 0.25, "usdValue": "$344.56" }
  ]
}
```

---

## ⚙️ Setup

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BINANCE_API_KEY` | Your Binance API Key | ✅ |
| `BINANCE_SECRET` | Your Binance API Secret | ✅ |
| `BINANCE_TESTNET` | Set to `1` for testnet | Optional |

### API Key Permissions

| Permission | Required For |
|------------|--------------|
| ✅ Read | Portfolio, prices, history |
| ✅ Spot Trading | Buy, sell, swap |
| ◻️ Futures | View futures positions |
| ◻️ Convert | Convert API (optional) |

👉 Create API keys at [binance.com/en/my/settings/api-management](https://www.binance.com/en/my/settings/api-management)

---

## 📖 Commands

### 🔄 Swap (Recommended)

The smart way to trade. Automatically finds the best route.

```bash
node scripts/binance.mjs swap ETH USDC 0.1 --confirm
```

**Features:**
- ✅ Works with ANY pair combination
- ✅ Auto-routes via USDT if no direct pair
- ✅ Preview before execution

---

### 📊 Portfolio & Prices

```bash
# Full portfolio with USD values
node scripts/binance.mjs portfolio

# Single asset balance
node scripts/binance.mjs balance ETH

# Get price (default: vs USDT)
node scripts/binance.mjs price BTC

# Price vs specific currency
node scripts/binance.mjs price ETH --for USDC
```

---

### 📈 Buy & Sell

```bash
# Buy $100 worth of BTC
node scripts/binance.mjs buy BTC 100 --quote --confirm

# Sell 0.05 ETH for USDC
node scripts/binance.mjs sell ETH 0.05 --for USDC --confirm

# Sell ALL of an asset
node scripts/binance.mjs sell DOGE --all --confirm

# Limit orders
node scripts/binance.mjs buy BTC 0.01 --limit 40000 --confirm
```

---

### 📋 Orders

```bash
# View open orders
node scripts/binance.mjs orders

# Cancel order
node scripts/binance.mjs cancel 12345678

# Cancel all orders for a symbol
node scripts/binance.mjs cancel-all BTC
```

---

### 💹 Futures

```bash
# View positions
node scripts/binance.mjs futures positions
```

---

### 📜 History

```bash
# Last 30 days
node scripts/binance.mjs history trades BTC

# Custom range
node scripts/binance.mjs history trades ETH --days 7
```

---

### 💰 Deposits

```bash
# Get deposit address
node scripts/binance.mjs deposit-address BTC
node scripts/binance.mjs deposit-address USDT --network TRC20
```

---

## 🛡️ Safety

**All trading commands preview by default.** Nothing executes without `--confirm`.

```bash
# This shows what WOULD happen:
node scripts/binance.mjs swap ETH BTC 0.1

# Output:
{
  "preview": true,
  "action": "SWAP",
  "from": "0.1 ETH",
  "to": "~0.0033 BTC",
  "message": "⚠️ Add --confirm to execute"
}

# Only this actually trades:
node scripts/binance.mjs swap ETH BTC 0.1 --confirm
```

---

## 🧪 Testnet

Practice without real money:

```bash
export BINANCE_TESTNET=1
export BINANCE_API_KEY="testnet_key"
export BINANCE_SECRET="testnet_secret"
```

Get testnet keys: [testnet.binance.vision](https://testnet.binance.vision/)

---

## 🔧 Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| -1013 | LOT_SIZE | Amount too small or wrong precision |
| -2010 | Insufficient balance | Check your balance first |
| -1021 | Timestamp | Sync your system clock |
| -2015 | Invalid API key | Check/regenerate keys |

---

## 📚 Command Reference

| Command | Description |
|---------|-------------|
| `portfolio` | View all balances with USD values |
| `balance <ASSET>` | Check single asset |
| `price <SYMBOL>` | Get current price |
| `buy <SYM> <AMT>` | Buy asset |
| `sell <SYM> <AMT>` | Sell asset |
| `swap <FROM> <TO> <AMT>` | Smart swap between any assets |
| `orders` | View open orders |
| `cancel <ID>` | Cancel order |
| `cancel-all <SYM>` | Cancel all orders for symbol |
| `history trades <SYM>` | Trade history |
| `futures positions` | View futures positions |
| `deposit-address <SYM>` | Get deposit address |

### Common Options

| Option | Description |
|--------|-------------|
| `--confirm` | Execute the trade (required) |
| `--for <ASSET>` | Specify quote currency |
| `--quote` | Amount is in quote currency |
| `--all` | Sell entire balance |
| `--limit <PRICE>` | Limit order price |
| `--days <N>` | History period |

---

## 💎 New to Binance?

Get **fee discounts** with our referral:

👉 [**Sign up here**](https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00UIF03H0N) | Code: `CPA_00UIF03H0N`

---

## 🔗 Links

- [Binance](https://www.binance.com/)
- [API Docs](https://binance-docs.github.io/apidocs/)
- [Testnet](https://testnet.binance.vision/)
- [GitHub](https://github.com/dreddster/binance-enhanced)
