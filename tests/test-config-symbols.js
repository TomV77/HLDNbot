import HyperliquidConnector from '../connectors/hyperliquid.js';
import { loadConfig, getSymbols } from '../utils/config.js';

/**
 * Test subscribing to all symbols from config.json
 */

async function testConfigSymbols() {
  console.log('Testing Hyperliquid Connector with Config Symbols');
  console.log('='.repeat(60));

  // Load config
  const config = loadConfig();
  const symbols = getSymbols();

  console.log('Loaded config:');
  console.log(`  Symbols: ${symbols.join(', ')}`);
  console.log();

  const connector = new HyperliquidConnector({
    pingInterval: 30000,
    pongTimeout: 10000
  });

  // Event listeners
  connector.on('connected', () => {
    console.log('[Event] Connected to Hyperliquid');
  });

  connector.on('disconnected', () => {
    console.log('[Event] Disconnected from Hyperliquid');
  });

  connector.on('error', (error) => {
    console.error('[Event] Error:', error.message);
  });

  try {
    // Connect
    console.log('Connecting...');
    await connector.connect();

    // Subscribe to all symbols from config
    console.log(`\nSubscribing to ${symbols.length} symbols...`);
    for (const symbol of symbols) {
      try {
        await connector.subscribeOrderbook(symbol);
        console.log(`  ✓ Subscribed to ${symbol}`);
      } catch (error) {
        console.error(`  ✗ Failed to subscribe to ${symbol}:`, error.message);
      }
    }

    console.log('\nWaiting for orderbook data...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Print bid/ask for all symbols
    console.log('Current Prices:');
    console.log('='.repeat(60));

    for (const symbol of symbols) {
      const bidAsk = connector.getBidAsk(symbol);

      if (bidAsk) {
        const spread = bidAsk.ask - bidAsk.bid;
        const spreadBps = ((spread / bidAsk.bid) * 10000).toFixed(2);

        console.log(`${symbol.padEnd(12)} | Bid: ${String(bidAsk.bid).padEnd(12)} | Ask: ${String(bidAsk.ask).padEnd(12)} | Spread: ${spreadBps} bps`);
      } else {
        console.log(`${symbol.padEnd(12)} | No data available`);
      }
    }

    console.log('='.repeat(60));

    // Monitor for 20 seconds
    console.log('\nMonitoring live updates for 20 seconds...\n');

    let updateCount = 0;
    connector.on('orderbook', (book) => {
      updateCount++;
      if (updateCount % 10 === 0) { // Print every 10th update
        console.log(`[${updateCount}] ${book.coin}: ${book.bestBid?.price} / ${book.bestAsk?.price}`);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 20000));

    console.log(`\n✓ Received ${updateCount} total orderbook updates`);

    // Final status
    const status = connector.getStatus();
    console.log('\nFinal Status:', {
      connected: status.connected,
      subscriptions: status.subscriptions,
      mode: status.useRestFallback ? 'REST' : 'WebSocket'
    });

    // Disconnect
    connector.disconnect();
    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    connector.disconnect();
    process.exit(1);
  }
}

testConfigSymbols();
