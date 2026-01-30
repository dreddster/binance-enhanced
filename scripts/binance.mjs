#!/usr/bin/env node
/**
 * Binance Enhanced CLI
 * Complete Binance integration for Clawdbot
 */

import crypto from 'crypto';
import https from 'https';

// ============================================================================
// Configuration
// ============================================================================

const API_KEY = process.env.BINANCE_API_KEY;
const SECRET = process.env.BINANCE_SECRET;
const TESTNET = process.env.BINANCE_TESTNET === '1';

const BASE_URL = TESTNET 
  ? 'https://testnet.binance.vision'
  : 'https://api.binance.com';

const FUTURES_URL = TESTNET
  ? 'https://testnet.binancefuture.com'
  : 'https://fapi.binance.com';

// ============================================================================
// Helpers
// ============================================================================

function sign(queryString) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(queryString)
    .digest('hex');
}

function buildQuery(params) {
  params.timestamp = Date.now();
  const query = new URLSearchParams(params).toString();
  const signature = sign(query);
  return `${query}&signature=${signature}`;
}

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (!options.public && API_KEY) {
      headers['X-MBX-APIKEY'] = API_KEY;
    }
    
    const req = https.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function publicRequest(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${endpoint}${query ? '?' + query : ''}`;
  return request(url, { public: true });
}

async function privateRequest(endpoint, params = {}, method = 'GET') {
  if (!API_KEY || !SECRET) {
    console.error(JSON.stringify({ error: 'API_KEY and SECRET required' }));
    process.exit(1);
  }
  const query = buildQuery(params);
  const url = `${BASE_URL}${endpoint}?${query}`;
  return request(url, { method });
}

async function futuresRequest(endpoint, params = {}, method = 'GET') {
  if (!API_KEY || !SECRET) {
    console.error(JSON.stringify({ error: 'API_KEY and SECRET required' }));
    process.exit(1);
  }
  const query = buildQuery(params);
  const url = `${FUTURES_URL}${endpoint}?${query}`;
  return request(url, { method });
}

function formatUSD(num) {
  return parseFloat(num).toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  });
}

// ============================================================================
// Pair Resolution
// ============================================================================

async function findTradingPair(baseAsset, quoteAsset) {
  const directPair = baseAsset.toUpperCase() + quoteAsset.toUpperCase();
  const directCheck = await publicRequest('/api/v3/ticker/price', { symbol: directPair });
  if (directCheck.price) {
    return { symbol: directPair, side: 'direct' };
  }
  
  const reversePair = quoteAsset.toUpperCase() + baseAsset.toUpperCase();
  const reverseCheck = await publicRequest('/api/v3/ticker/price', { symbol: reversePair });
  if (reverseCheck.price) {
    return { symbol: reversePair, side: 'reverse' };
  }
  
  return null;
}

async function getPairPrice(symbol) {
  const ticker = await publicRequest('/api/v3/ticker/price', { symbol });
  return ticker.price ? parseFloat(ticker.price) : null;
}

// ============================================================================
// Commands
// ============================================================================

async function getPrice(symbol, quoteAsset = 'USDT') {
  const pair = symbol.toUpperCase() + quoteAsset.toUpperCase();
  const [ticker, ticker24h] = await Promise.all([
    publicRequest('/api/v3/ticker/price', { symbol: pair }),
    publicRequest('/api/v3/ticker/24hr', { symbol: pair })
  ]);
  
  if (ticker.code) {
    return { error: ticker.msg };
  }
  
  return {
    symbol: pair,
    price: formatUSD(ticker.price),
    priceRaw: parseFloat(ticker.price),
    change24h: `${parseFloat(ticker24h.priceChangePercent).toFixed(2)}%`,
    high24h: formatUSD(ticker24h.highPrice),
    low24h: formatUSD(ticker24h.lowPrice),
    volume24h: formatUSD(parseFloat(ticker24h.quoteVolume))
  };
}

async function getPortfolio() {
  const account = await privateRequest('/api/v3/account');
  
  if (account.code) {
    return { error: account.msg };
  }
  
  const balances = account.balances
    .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map(b => ({
      asset: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
      total: parseFloat(b.free) + parseFloat(b.locked)
    }));
  
  let totalUSD = 0;
  const enriched = [];
  
  for (const bal of balances) {
    let usdValue = 0;
    if (bal.asset === 'USDT' || bal.asset === 'USDC' || bal.asset === 'BUSD') {
      usdValue = bal.total;
    } else {
      try {
        const price = await publicRequest('/api/v3/ticker/price', { 
          symbol: bal.asset + 'USDT' 
        });
        if (price.price) {
          usdValue = bal.total * parseFloat(price.price);
        }
      } catch {}
    }
    totalUSD += usdValue;
    enriched.push({
      ...bal,
      usdValue: formatUSD(usdValue)
    });
  }
  
  return {
    totalUSD: formatUSD(totalUSD),
    assets: enriched.sort((a, b) => 
      parseFloat(b.usdValue.replace(/[$,]/g, '')) - 
      parseFloat(a.usdValue.replace(/[$,]/g, ''))
    )
  };
}

async function getOrders(symbol, quoteAsset = 'USDT') {
  const params = symbol ? { symbol: symbol.toUpperCase() + quoteAsset.toUpperCase() } : {};
  const orders = await privateRequest('/api/v3/openOrders', params);
  
  if (orders.code) {
    return { error: orders.msg };
  }
  
  return orders.map(o => ({
    orderId: o.orderId,
    symbol: o.symbol,
    side: o.side,
    type: o.type,
    price: o.price,
    quantity: o.origQty,
    filled: o.executedQty,
    status: o.status
  }));
}

async function placeBuyOrder(symbol, amount, options = {}) {
  const quoteAsset = options.for || 'USDT';
  const pair = symbol.toUpperCase() + quoteAsset.toUpperCase();
  
  const pairCheck = await publicRequest('/api/v3/ticker/price', { symbol: pair });
  if (pairCheck.code) {
    return { error: `Trading pair ${pair} not found. Try a different --for currency.` };
  }
  
  const currentPrice = parseFloat(pairCheck.price);
  
  const params = {
    symbol: pair,
    side: 'BUY',
    type: options.limit ? 'LIMIT' : 'MARKET',
  };
  
  if (options.limit) {
    params.price = options.limit;
    params.timeInForce = 'GTC';
    params.quantity = amount;
  } else if (options.quote) {
    params.quoteOrderQty = amount;
  } else {
    params.quantity = amount;
  }
  
  // Always return preview unless --confirm is passed
  if (!options.confirmed) {
    return {
      preview: true,
      action: 'BUY',
      symbol: pair,
      amount: amount,
      type: options.limit ? 'LIMIT' : 'MARKET',
      limitPrice: options.limit || null,
      currentPrice: formatUSD(currentPrice),
      estimatedCost: options.quote ? `${amount} ${quoteAsset}` : formatUSD(amount * currentPrice),
      message: '⚠️ Add --confirm to execute this trade'
    };
  }
  
  const result = await privateRequest('/api/v3/order', params, 'POST');
  
  if (result.code) {
    return { error: result.msg, code: result.code };
  }
  
  return {
    success: true,
    orderId: result.orderId,
    symbol: result.symbol,
    side: result.side,
    type: result.type,
    quantity: result.origQty || result.executedQty,
    price: result.price || 'MARKET',
    status: result.status
  };
}

async function placeSellOrder(symbol, amount, options = {}) {
  const quoteAsset = options.for || 'USDT';
  const pair = symbol.toUpperCase() + quoteAsset.toUpperCase();
  
  const pairCheck = await publicRequest('/api/v3/ticker/price', { symbol: pair });
  if (pairCheck.code) {
    return { error: `Trading pair ${pair} not found. Try a different --for currency.` };
  }
  
  const currentPrice = parseFloat(pairCheck.price);
  
  if (options.all) {
    const portfolio = await getPortfolio();
    const asset = portfolio.assets?.find(a => a.asset === symbol.toUpperCase());
    if (!asset) {
      return { error: `No ${symbol} balance found` };
    }
    amount = asset.free;
  }
  
  const params = {
    symbol: pair,
    side: 'SELL',
    type: options.limit ? 'LIMIT' : 'MARKET',
    quantity: amount
  };
  
  if (options.limit) {
    params.price = options.limit;
    params.timeInForce = 'GTC';
  }
  
  // Always return preview unless --confirm is passed
  if (!options.confirmed) {
    return {
      preview: true,
      action: 'SELL',
      symbol: pair,
      amount: amount,
      type: options.limit ? 'LIMIT' : 'MARKET',
      limitPrice: options.limit || null,
      currentPrice: formatUSD(currentPrice),
      estimatedProceeds: `${(amount * currentPrice).toFixed(2)} ${quoteAsset}`,
      message: '⚠️ Add --confirm to execute this trade'
    };
  }
  
  const result = await privateRequest('/api/v3/order', params, 'POST');
  
  if (result.code) {
    return { error: result.msg, code: result.code };
  }
  
  return {
    success: true,
    orderId: result.orderId,
    symbol: result.symbol,
    side: result.side,
    type: result.type,
    quantity: result.origQty || result.executedQty,
    price: result.price || 'MARKET',
    status: result.status
  };
}

async function swap(fromAsset, toAsset, amount, options = {}) {
  fromAsset = fromAsset.toUpperCase();
  toAsset = toAsset.toUpperCase();
  
  const pairInfo = await findTradingPair(fromAsset, toAsset);
  
  if (!pairInfo) {
    return await swapViaUsdt(fromAsset, toAsset, amount, options);
  }
  
  const { symbol, side } = pairInfo;
  const price = await getPairPrice(symbol);
  
  let estimatedReceive;
  
  if (side === 'direct') {
    estimatedReceive = (amount * price).toFixed(6);
  } else {
    estimatedReceive = (amount / price).toFixed(6);
  }
  
  // Always return preview unless --confirm is passed
  if (!options.confirmed) {
    return {
      preview: true,
      action: 'SWAP',
      from: `${amount} ${fromAsset}`,
      to: `~${estimatedReceive} ${toAsset}`,
      pair: symbol,
      direction: side === 'direct' ? 'SELL' : 'BUY',
      price: price,
      message: '⚠️ Add --confirm to execute this trade'
    };
  }
  
  let params;
  if (side === 'direct') {
    params = {
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: amount
    };
  } else {
    params = {
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: amount
    };
  }
  
  const result = await privateRequest('/api/v3/order', params, 'POST');
  
  if (result.code) {
    return { error: result.msg, code: result.code };
  }
  
  return {
    success: true,
    action: 'SWAP',
    from: `${amount} ${fromAsset}`,
    received: `${result.executedQty || result.cummulativeQuoteQty} ${toAsset}`,
    orderId: result.orderId,
    status: result.status
  };
}

async function swapViaUsdt(fromAsset, toAsset, amount, options = {}) {
  const sellPair = fromAsset + 'USDT';
  const sellPrice = await getPairPrice(sellPair);
  
  if (!sellPrice) {
    return { error: `Cannot find ${sellPair} pair` };
  }
  
  const usdtAmount = amount * sellPrice;
  
  const buyPair = toAsset + 'USDT';
  const buyPrice = await getPairPrice(buyPair);
  
  if (!buyPrice) {
    return { error: `Cannot find ${buyPair} pair` };
  }
  
  const estimatedReceive = usdtAmount / buyPrice;
  
  // Always return preview unless --confirm is passed
  if (!options.confirmed) {
    return {
      preview: true,
      action: 'SWAP (via USDT)',
      from: `${amount} ${fromAsset}`,
      to: `~${estimatedReceive.toFixed(6)} ${toAsset}`,
      route: `${fromAsset} → USDT → ${toAsset}`,
      step1: `Sell ${amount} ${fromAsset} → ~${usdtAmount.toFixed(2)} USDT`,
      step2: `Buy ${toAsset} with ~${usdtAmount.toFixed(2)} USDT`,
      message: '⚠️ Add --confirm to execute (2 transactions)'
    };
  }
  
  const sellResult = await privateRequest('/api/v3/order', {
    symbol: sellPair,
    side: 'SELL',
    type: 'MARKET',
    quantity: amount
  }, 'POST');
  
  if (sellResult.code) {
    return { error: `Step 1 failed: ${sellResult.msg}`, code: sellResult.code };
  }
  
  const actualUsdt = parseFloat(sellResult.cummulativeQuoteQty);
  
  const buyResult = await privateRequest('/api/v3/order', {
    symbol: buyPair,
    side: 'BUY',
    type: 'MARKET',
    quoteOrderQty: actualUsdt
  }, 'POST');
  
  if (buyResult.code) {
    return { 
      error: `Step 2 failed: ${buyResult.msg}`, 
      code: buyResult.code,
      step1Complete: true,
      usdtReceived: actualUsdt
    };
  }
  
  return {
    success: true,
    action: 'SWAP',
    from: `${amount} ${fromAsset}`,
    received: `${buyResult.executedQty} ${toAsset}`,
    route: `${fromAsset} → USDT → ${toAsset}`,
    orders: [sellResult.orderId, buyResult.orderId]
  };
}

async function cancelOrder(orderId, symbol) {
  const params = { orderId };
  if (symbol) params.symbol = symbol.toUpperCase() + 'USDT';
  
  const result = await privateRequest('/api/v3/order', params, 'DELETE');
  
  if (result.code) {
    return { error: result.msg };
  }
  
  return { success: true, cancelled: orderId };
}

async function cancelAllOrders(symbol) {
  const pair = symbol ? symbol.toUpperCase() + 'USDT' : null;
  
  if (!pair) {
    return { error: 'Symbol required for cancel-all' };
  }
  
  const result = await privateRequest('/api/v3/openOrders', { symbol: pair }, 'DELETE');
  
  if (result.code) {
    return { error: result.msg };
  }
  
  return { success: true, cancelled: result.length, orders: result };
}

async function getTradeHistory(symbol, days = 30) {
  const pair = symbol ? symbol.toUpperCase() + 'USDT' : null;
  const params = pair ? { symbol: pair } : {};
  
  if (!pair) {
    return { error: 'Symbol required for trade history' };
  }
  
  const trades = await privateRequest('/api/v3/myTrades', params);
  
  if (trades.code) {
    return { error: trades.msg };
  }
  
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  return trades
    .filter(t => t.time > cutoff)
    .map(t => ({
      time: new Date(t.time).toISOString(),
      symbol: t.symbol,
      side: t.isBuyer ? 'BUY' : 'SELL',
      price: t.price,
      quantity: t.qty,
      total: formatUSD(parseFloat(t.price) * parseFloat(t.qty)),
      fee: `${t.commission} ${t.commissionAsset}`
    }))
    .slice(-50);
}

async function futuresPositions() {
  const positions = await futuresRequest('/fapi/v2/positionRisk');
  
  if (positions.code) {
    return { error: positions.msg };
  }
  
  return positions
    .filter(p => parseFloat(p.positionAmt) !== 0)
    .map(p => ({
      symbol: p.symbol,
      side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
      size: Math.abs(parseFloat(p.positionAmt)),
      entryPrice: formatUSD(p.entryPrice),
      markPrice: formatUSD(p.markPrice),
      pnl: formatUSD(p.unRealizedProfit),
      pnlPercent: ((parseFloat(p.unRealizedProfit) / (parseFloat(p.entryPrice) * Math.abs(parseFloat(p.positionAmt)))) * 100).toFixed(2) + '%',
      leverage: p.leverage + 'x',
      liquidationPrice: formatUSD(p.liquidationPrice)
    }));
}

async function convert(fromAsset, toAsset, amount, quoteOnly = false) {
  const params = {
    fromAsset: fromAsset.toUpperCase(),
    toAsset: toAsset.toUpperCase(),
    fromAmount: amount
  };
  
  const quote = await privateRequest('/sapi/v1/convert/getQuote', params, 'POST');
  
  if (quote.code) {
    if (quote.msg?.includes('not authorized')) {
      return { 
        error: 'Convert API not authorized. Use "swap" command instead.',
        suggestion: `Try: swap ${fromAsset} ${toAsset} ${amount} --confirm`
      };
    }
    return { error: quote.msg };
  }
  
  if (quoteOnly) {
    return {
      quote: true,
      from: `${amount} ${fromAsset.toUpperCase()}`,
      to: `${quote.toAmount} ${toAsset.toUpperCase()}`,
      rate: quote.ratio,
      validFor: '10 seconds'
    };
  }
  
  const accept = await privateRequest('/sapi/v1/convert/acceptQuote', {
    quoteId: quote.quoteId
  }, 'POST');
  
  if (accept.code) {
    return { error: accept.msg };
  }
  
  return {
    success: true,
    from: `${amount} ${fromAsset.toUpperCase()}`,
    to: `${accept.toAmount} ${toAsset.toUpperCase()}`
  };
}

async function depositAddress(asset, network) {
  const params = { coin: asset.toUpperCase() };
  if (network) params.network = network.toUpperCase();
  
  const result = await privateRequest('/sapi/v1/capital/deposit/address', params);
  
  if (result.code) {
    return { error: result.msg };
  }
  
  return {
    asset: result.coin,
    network: result.network,
    address: result.address,
    memo: result.tag || null
  };
}

async function getBalance(asset) {
  const portfolio = await getPortfolio();
  if (portfolio.error) return portfolio;
  
  const found = portfolio.assets?.find(a => a.asset === asset.toUpperCase());
  if (!found) {
    return { asset: asset.toUpperCase(), balance: 0, usdValue: '$0.00' };
  }
  
  return {
    asset: found.asset,
    balance: found.free,
    locked: found.locked,
    total: found.total,
    usdValue: found.usdValue
  };
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

const flags = parseFlags(args);

async function main() {
  let result;
  
  switch (command) {
    case 'price':
      result = await getPrice(args[1] || 'BTC', flags.for || 'USDT');
      break;
      
    case 'portfolio':
      result = await getPortfolio();
      break;
      
    case 'balance':
      result = await getBalance(args[1] || 'BTC');
      break;
      
    case 'orders':
      result = await getOrders(args[1], flags.for || 'USDT');
      break;
      
    case 'buy':
      result = await placeBuyOrder(args[1], args[2], {
        limit: flags.limit,
        quote: flags.quote,
        for: flags.for,
        confirmed: flags.confirm
      });
      break;
      
    case 'sell':
      result = await placeSellOrder(args[1], args[2], {
        limit: flags.limit,
        all: flags.all,
        for: flags.for,
        confirmed: flags.confirm
      });
      break;
      
    case 'swap':
      result = await swap(args[1], args[2], args[3], {
        confirmed: flags.confirm
      });
      break;
      
    case 'cancel':
      result = await cancelOrder(args[1], args[2]);
      break;
      
    case 'cancel-all':
      result = await cancelAllOrders(args[1]);
      break;
      
    case 'history':
      if (args[1] === 'trades') {
        result = await getTradeHistory(args[2], flags.days || 30);
      } else {
        result = { error: 'Usage: history trades <SYMBOL> --days 30' };
      }
      break;
      
    case 'futures':
      if (args[1] === 'positions') {
        result = await futuresPositions();
      } else {
        result = { error: 'Usage: futures positions' };
      }
      break;
      
    case 'convert':
      result = await convert(args[1], args[2], args[3], flags['quote-only']);
      break;
      
    case 'deposit-address':
      result = await depositAddress(args[1], flags.network);
      break;
      
    default:
      result = {
        usage: 'binance.mjs <command> [options]',
        commands: [
          'price <SYMBOL>              - Get price (--for USDC)',
          'portfolio                   - View all balances',
          'balance <ASSET>             - Check single asset balance',
          'orders [SYMBOL]             - View open orders',
          'buy <SYMBOL> <AMT>          - Buy (--for, --quote, --limit, --confirm)',
          'sell <SYMBOL> <AMT>         - Sell (--for, --all, --limit, --confirm)',
          'swap <FROM> <TO> <AMT>      - Swap assets (--confirm)',
          'cancel <ORDER_ID> [SYMBOL]  - Cancel order',
          'cancel-all <SYMBOL>         - Cancel all orders',
          'history trades <SYMBOL>     - Trade history (--days)',
          'futures positions           - View futures positions',
          'convert <FROM> <TO> <AMT>   - Convert (needs API permission)',
          'deposit-address <ASSET>     - Get deposit address (--network)'
        ],
        notes: [
          '⚠️  Trading commands show preview by default',
          '⚠️  Add --confirm to actually execute trades'
        ],
        examples: [
          'binance.mjs swap ETH USDC 0.05           # Preview',
          'binance.mjs swap ETH USDC 0.05 --confirm # Execute',
          'binance.mjs sell ETH 0.05 --for USDC     # Preview',
          'binance.mjs buy BTC 50 --quote --confirm # Buy $50 of BTC'
        ]
      };
  }
  
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
