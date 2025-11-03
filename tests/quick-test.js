import HyperliquidConnector from '../connectors/hyperliquid.js';

/**
 * Quick test to verify Hyperliquid connector is working
 * This will connect, subscribe to BTC and ETH, print bid/ask for 30 seconds, then exit
 */

async function quickTest() {
  console.log('Quick Test - Hyperliquid Connector');
  console.log('===================================\n');

  const connector = new HyperliquidConnector({
    pingInterval: 30000,
    pongTimeout: 10000
  });

  // Event listeners
  connector.on('connected', () => {
    console.log('[Event] Connected to Hyperliquid\n');
  });

  connector.on('disconnected', () => {
    console.log('[Event] Disconnected from Hyperliquid');
  });

  connector.on('error', (error) => {
    console.error('[Event] Error:', error.message);
  });

  connector.on('fallback', (mode) => {
    console.log(`[Event] Switched to ${mode} fallback mode`);
  });

  try {
    // Connect
    console.log('Connecting...');
    await connector.connect();

    // Subscribe to coins
    console.log('Subscribing to BTC and ETH orderbooks...\n');
    await connector.subscribeOrderbook('BTC');
    await connector.subscribeOrderbook('ETH');

    // Print bid/ask every second
    const interval = setInterval(() => {
      console.clear();
      console.log('Hyperliquid Orderbook - Live Data');
      console.log('==================================\n');

      const btcBidAsk = connector.getBidAsk('BTC');
      const ethBidAsk = connector.getBidAsk('ETH');

      if (btcBidAsk) {
        const spread = btcBidAsk.ask - btcBidAsk.bid;
        const spreadBps = ((spread / btcBidAsk.bid) * 10000).toFixed(2);
        console.log('BTC:');
        console.log(`  Bid: ${btcBidAsk.bid?.toFixed(2)} (${btcBidAsk.bidSize})`);
        console.log(`  Ask: ${btcBidAsk.ask?.toFixed(2)} (${btcBidAsk.askSize})`);
        console.log(`  Spread: ${spread.toFixed(2)} (${spreadBps} bps)`);
        console.log(`  Time: ${new Date(btcBidAsk.timestamp).toLocaleTimeString()}\n`);
      } else {
        console.log('BTC: Waiting for data...\n');
      }

      if (ethBidAsk) {
        const spread = ethBidAsk.ask - ethBidAsk.bid;
        const spreadBps = ((spread / ethBidAsk.bid) * 10000).toFixed(2);
        console.log('ETH:');
        console.log(`  Bid: ${ethBidAsk.bid?.toFixed(2)} (${ethBidAsk.bidSize})`);
        console.log(`  Ask: ${ethBidAsk.ask?.toFixed(2)} (${ethBidAsk.askSize})`);
        console.log(`  Spread: ${spread.toFixed(2)} (${spreadBps} bps)`);
        console.log(`  Time: ${new Date(ethBidAsk.timestamp).toLocaleTimeString()}\n`);
      } else {
        console.log('ETH: Waiting for data...\n');
      }

      const status = connector.getStatus();
      console.log('Status:', {
        connected: status.connected,
        mode: status.useRestFallback ? 'REST' : 'WebSocket',
        subscriptions: status.subscriptions.length
      });
    }, 1000);

    // Run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Cleanup
    clearInterval(interval);
    connector.disconnect();

    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    connector.disconnect();
    process.exit(1);
  }
}

quickTest();
