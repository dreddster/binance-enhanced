---
name: binance-enhanced
description: Complete Binance integration — spot, futures, copy trading, bots, earn, P2P, and more. The definitive Binance skill.
metadata: {"clawdbot":{"emoji":"💛","always":true,"requires":{"bins":["node","curl","jq"]}}}
---

# Binance Enhanced 💛

The **complete** Binance skill. Trade, earn, copy, automate — everything Binance offers in one place.

## Quick Start

```bash
# Set your API keys
export BINANCE_API_KEY="your_key"
export BINANCE_SECRET="your_secret"

# Check your portfolio
node scripts/binance.mjs portfolio

# Get BTC price
node scripts/binance.mjs price BTC

# Swap ETH to USDC
node scripts/binance.mjs swap ETH USDC 0.05 --confirm
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BINANCE_API_KEY` | API Key from Binance | Yes |
| `BINANCE_SECRET` | API Secret | Yes |
| `BINANCE_TESTNET` | Set to `1` for testnet | No |

### API Key Permissions

| Permission | Needed For | Required |
|------------|------------|----------|
| Read | Portfolio, prices, history | ✅ Yes |
| Spot Trading | Buy/sell spot, swap | For trading |
| Futures | Perpetual trading | For futures |
| Margin | Margin trading | For margin |
| Convert | Convert API (not swap) | Optional |
| Withdraw | Withdrawals | Optional |

> ⚠️ **Convert vs Swap**: The `convert` command uses Binance's Convert API which requires special permission. The `swap` command uses regular spot trading and works with standard Spot Trading permission.

---

## 🔄 Swap (Recommended for Trading)

**Swap any asset to any other asset.** Handles pair direction automatically. If no direct pair exists, routes through USDT.

```bash
# Swap ETH to USDC
node scripts/binance.mjs swap ETH USDC 0.05 --confirm

# Swap USDT to BTC
node scripts/binance.mjs swap USDT BTC 100 --confirm

# Preview first (no --confirm)
node scripts/binance.mjs swap BTC ETH 0.001
```

**Why use swap?**
- Works with any pair combination
- Auto-routes via USDT if needed
- Only needs Spot Trading permission
- More reliable than Convert API

---

## 📊 Portfolio & Prices

### Check Portfolio
```bash
node scripts/binance.mjs portfolio
```

### Check Single Asset
```bash
node scripts/binance.mjs balance ETH
```

### Get Price
```bash
# Default: vs USDT
node scripts/binance.mjs price BTC

# Specific quote currency
node scripts/binance.mjs price ETH --for USDC
node scripts/binance.mjs price BTC --for EUR
```

---

## 📈 Spot Trading

### Buy

```bash
# Buy with quote currency (e.g., spend $100 USDT on BTC)
node scripts/binance.mjs buy BTC 100 --quote --confirm

# Buy specific amount
node scripts/binance.mjs buy ETH 0.1 --confirm

# Buy with specific quote currency
node scripts/binance.mjs buy BTC 50 --for USDC --quote --confirm

# Limit order
node scripts/binance.mjs buy BTC 0.01 --limit 40000 --confirm
```

### Sell

```bash
# Sell specific amount
node scripts/binance.mjs sell ETH 0.05 --confirm

# Sell for specific currency (not USDT)
node scripts/binance.mjs sell ETH 0.05 --for USDC --confirm

# Sell all of an asset
node scripts/binance.mjs sell TLM --all --confirm

# Limit order
node scripts/binance.mjs sell BTC 0.01 --limit 50000 --confirm
```

### Order Management
```bash
# View open orders
node scripts/binance.mjs orders
node scripts/binance.mjs orders BTC

# Cancel specific order
node scripts/binance.mjs cancel 12345678

# Cancel all BTC orders
node scripts/binance.mjs cancel-all BTC
```

---

## 📉 Futures Trading

### View Positions
```bash
node scripts/binance.mjs futures positions
```

### Open Position (via API)
```bash
# Long 0.1 BTC with 10x leverage
node scripts/binance.mjs futures long BTC 0.1 --leverage 10

# Short ETH
node scripts/binance.mjs futures short ETH 1 --leverage 5
```

⚠️ **Warning**: Futures trading with leverage carries significant risk. Max 125x available but not recommended.

---

## 🔄 Convert (Requires Permission)

> **Note**: Convert API requires the "Convert" permission on your API key. If you get "not authorized", use the `swap` command instead.

```bash
# Get quote
node scripts/binance.mjs convert USDT BTC 100 --quote-only

# Execute conversion
node scripts/binance.mjs convert USDT BTC 100
```

---

## 💰 Withdrawals & Deposits

### Deposit Address
```bash
node scripts/binance.mjs deposit-address BTC
node scripts/binance.mjs deposit-address USDT --network TRC20
```

---

## 📜 History

```bash
# Trade history (last 30 days)
node scripts/binance.mjs history trades BTC

# Custom period
node scripts/binance.mjs history trades ETH --days 7
```

---

## 🧪 Testnet Mode

For testing without real money:

```bash
export BINANCE_TESTNET=1
export BINANCE_API_KEY="testnet_key"
export BINANCE_SECRET="testnet_secret"
```

Get testnet keys at: https://testnet.binance.vision/

---

## 🛡️ Safety Rules

### Before Any Trade
1. ✅ Preview order first (run without `--confirm`)
2. ✅ Check current price and estimated cost
3. ✅ Verify you have sufficient balance
4. ❌ Never execute without reviewing the preview

### Position Sizing Warnings
| Condition | Action |
|-----------|--------|
| Trade > 20% of portfolio | ⚠️ Warn about concentration risk |
| Leverage > 10x | ⚠️ Warn about liquidation risk |
| Limit price > 5% from market | ⚠️ Warn about potential mistake |

---

## 🔧 Error Handling

| Error Code | Meaning | Fix |
|------------|---------|-----|
| -1013 | Invalid quantity | Check lot size (min order) |
| -2010 | Insufficient balance | Check available balance |
| -1021 | Timestamp error | Sync system clock |
| -1022 | Invalid signature | Check API secret |
| -2015 | Invalid API key | Regenerate API key |
| not authorized | Missing API permission | Enable permission in Binance |

---

## 📋 Real-World Workflows

### "Sell $50 of ETH for USDC"

```bash
# 1. Check ETH price
node scripts/binance.mjs price ETH --for USDC

# 2. Calculate amount (e.g., $50 / $2700 = 0.0185 ETH)

# 3. Execute swap
node scripts/binance.mjs swap ETH USDC 0.0185 --confirm
```

Or use the sell command with quote:
```bash
node scripts/binance.mjs sell ETH 0.0185 --for USDC --confirm
```

### "Buy BTC with all my USDC"

```bash
# 1. Check USDC balance
node scripts/binance.mjs balance USDC

# 2. Swap all USDC to BTC
node scripts/binance.mjs swap USDC BTC 49.18 --confirm
```

### "Rebalance: Move 50% of ETH to BTC"

```bash
# 1. Check balances
node scripts/binance.mjs portfolio

# 2. Swap half of ETH (e.g., 0.05 ETH) to BTC
node scripts/binance.mjs swap ETH BTC 0.025 --confirm
```

### "Convert stablecoins: USDT → USDC"

```bash
node scripts/binance.mjs swap USDT USDC 100 --confirm
```

### "Check how much I'd get before trading"

```bash
# Preview without executing
node scripts/binance.mjs swap ETH USDC 0.1
# Shows: ~$270 USDC (estimated)

# If happy, execute
node scripts/binance.mjs swap ETH USDC 0.1 --confirm
```

---

## 💎 Referral

New to Binance? Get fee discounts:

👉 **[Sign up with referral](https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00UIF03H0N)**

Or use code: **`CPA_00UIF03H0N`**

---

## 📚 Links

- [Binance](https://www.binance.com/)
- [API Documentation](https://binance-docs.github.io/apidocs/)
- [Testnet](https://testnet.binance.vision/)
- [Fee Schedule](https://www.binance.com/en/fee/schedule)

---

## Command Reference

| Command | Description | Options |
|---------|-------------|---------|
| `price <SYM>` | Get current price | `--for <QUOTE>` |
| `portfolio` | View all balances | |
| `balance <SYM>` | Check single asset | |
| `buy <SYM> <AMT>` | Buy asset | `--for`, `--quote`, `--limit`, `--confirm` |
| `sell <SYM> <AMT>` | Sell asset | `--for`, `--all`, `--limit`, `--confirm` |
| `swap <FROM> <TO> <AMT>` | Swap assets | `--confirm` |
| `orders [SYM]` | View open orders | |
| `cancel <ID>` | Cancel order | |
| `cancel-all <SYM>` | Cancel all | |
| `history trades <SYM>` | Trade history | `--days` |
| `futures positions` | View futures | |
| `convert <FROM> <TO> <AMT>` | Convert API | `--quote-only` |
| `deposit-address <SYM>` | Get address | `--network` |
