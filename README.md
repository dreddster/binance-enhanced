# Binance Enhanced 💛

The **complete** Binance skill for [ClawdBot](https://github.com/clawdbot/clawdbot). Trade, earn, copy, automate — everything Binance offers in one place.

## Features

- 📈 **Spot Trading** — Buy/sell 600+ trading pairs
- 🔄 **Swap** — Convert any asset to any other (auto-routes via USDT if needed)
- 📊 **Portfolio** — View all balances with USD values
- 📉 **Futures** — View perpetual positions
- 💰 **Deposits** — Get deposit addresses for any asset
- 📜 **History** — Trade history and reports

## Quick Start

```bash
# Set your API keys
export BINANCE_API_KEY="your_key"
export BINANCE_SECRET="your_secret"

# Check portfolio
node scripts/binance.mjs portfolio

# Get BTC price
node scripts/binance.mjs price BTC

# Swap ETH to USDC (preview)
node scripts/binance.mjs swap ETH USDC 0.05

# Execute swap
node scripts/binance.mjs swap ETH USDC 0.05 --confirm
```

## Installation

### As ClawdBot Skill
```bash
# Coming soon to ClawdHub
clawdhub install binance-enhanced
```

### Standalone
```bash
git clone https://github.com/dreddster/binance-enhanced.git
cd binance-enhanced
```

## Commands

| Command | Description |
|---------|-------------|
| `price <SYM>` | Get current price |
| `portfolio` | View all balances |
| `balance <SYM>` | Check single asset |
| `buy <SYM> <AMT>` | Buy asset |
| `sell <SYM> <AMT>` | Sell asset |
| `swap <FROM> <TO> <AMT>` | Swap assets |
| `orders` | View open orders |
| `cancel <ID>` | Cancel order |
| `history trades <SYM>` | Trade history |
| `futures positions` | View futures |
| `deposit-address <SYM>` | Get deposit address |

See [SKILL.md](SKILL.md) for full documentation.

## Safety

⚠️ **All trading commands show a preview by default.** Add `--confirm` to execute.

```bash
# Preview only (safe)
node scripts/binance.mjs sell ETH 0.1

# Actually execute
node scripts/binance.mjs sell ETH 0.1 --confirm
```

## API Permissions

| Permission | Needed For |
|------------|------------|
| Read | Portfolio, prices, history |
| Spot Trading | Buy/sell/swap |
| Futures | Perpetual positions |

## Referral

New to Binance? Get fee discounts:

👉 [**Sign up with referral**](https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00UIF03H0N)

## License

MIT
