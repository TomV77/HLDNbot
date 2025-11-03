import HyperliquidConnector from '../connectors/hyperliquid.js';

/**
 * Basic test for Hyperliquid connector
 */
async function testBasicConnection() {
  console.log('=== Test 1: Basic Connection ===');

  const connector = new HyperliquidConnector({
    pingInterval: 30000,
    pongTimeout: 10000,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000
  });

  try {
    // Connect
    await connector.connect();
    console.log('✓ Connected successfully');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check status
    const status = connector.getStatus();
    console.log('✓ Status:', status);

    // Disconnect
    connector.disconnect();
    console.log('✓ Disconnected successfully');

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error);
    connector.disconnect();
    return false;
  }
}

/**
 * Test orderbook subscription and bid/ask retrieval
 */
async function testOrderbookSubscription() {
  console.log('\n=== Test 2: Orderbook Subscription ===');

  const connector = new HyperliquidConnector();

  try {
    // Connect
    await connector.connect();
    console.log('✓ Connected');

    // Subscribe to BTC orderbook
    console.log('Subscribing to BTC orderbook...');
    await connector.subscribeOrderbook('BTC');

    // Wait for orderbook updates
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get bid/ask
    const bidAsk = connector.getBidAsk('BTC');
    if (bidAsk) {
      console.log('✓ BTC Bid/Ask:', {
        bid: bidAsk.bid,
        ask: bidAsk.ask,
        bidSize: bidAsk.bidSize,
        askSize: bidAsk.askSize,
        spread: bidAsk.ask - bidAsk.bid,
        spreadBps: ((bidAsk.ask - bidAsk.bid) / bidAsk.bid * 10000).toFixed(2) + ' bps'
      });
    } else {
      console.error('✗ No bid/ask data received');
    }

    // Subscribe to ETH orderbook
    console.log('\nSubscribing to ETH orderbook...');
    await connector.subscribeOrderbook('ETH');

    // Wait for orderbook updates
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get bid/ask
    const ethBidAsk = connector.getBidAsk('ETH');
    if (ethBidAsk) {
      console.log('✓ ETH Bid/Ask:', {
        bid: ethBidAsk.bid,
        ask: ethBidAsk.ask,
        bidSize: ethBidAsk.bidSize,
        askSize: ethBidAsk.askSize,
        spread: ethBidAsk.ask - ethBidAsk.bid,
        spreadBps: ((ethBidAsk.ask - ethBidAsk.bid) / ethBidAsk.bid * 10000).toFixed(2) + ' bps'
      });
    } else {
      console.error('✗ No bid/ask data received');
    }

    // Check status
    const status = connector.getStatus();
    console.log('\n✓ Status:', status);

    // Disconnect
    connector.disconnect();
    console.log('✓ Disconnected');

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error);
    connector.disconnect();
    return false;
  }
}

/**
 * Test live orderbook streaming
 */
async function testLiveStreaming() {
  console.log('\n=== Test 3: Live Orderbook Streaming ===');

  const connector = new HyperliquidConnector();

  try {
    // Connect
    await connector.connect();
    console.log('✓ Connected');

    // Listen to orderbook updates
    let updateCount = 0;
    connector.on('orderbook', (orderbook) => {
      updateCount++;
      console.log(`[${updateCount}] ${orderbook.coin} - Bid: ${orderbook.bestBid?.price}, Ask: ${orderbook.bestAsk?.price}`);
    });

    // Subscribe to BTC orderbook
    console.log('Subscribing to BTC orderbook...');
    await connector.subscribeOrderbook('BTC');

    // Stream for 10 seconds
    console.log('Streaming for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log(`\n✓ Received ${updateCount} orderbook updates`);

    // Disconnect
    connector.disconnect();
    console.log('✓ Disconnected');

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error);
    connector.disconnect();
    return false;
  }
}

/**
 * Test connection health monitoring and reconnection
 */
async function testHealthMonitoring() {
  console.log('\n=== Test 4: Health Monitoring ===');

  const connector = new HyperliquidConnector({
    pingInterval: 5000,
    pongTimeout: 3000
  });

  try {
    // Listen to events
    connector.on('connected', () => {
      console.log('✓ Event: connected');
    });

    connector.on('disconnected', () => {
      console.log('✓ Event: disconnected');
    });

    connector.on('error', (error) => {
      console.log('✓ Event: error -', error.message);
    });

    // Connect
    await connector.connect();
    console.log('✓ Connected with health monitoring');

    // Wait for a few ping cycles
    console.log('Monitoring connection health for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    const status = connector.getStatus();
    console.log('✓ Status after health monitoring:', status);

    // Disconnect
    connector.disconnect();
    console.log('✓ Disconnected');

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error);
    connector.disconnect();
    return false;
  }
}

/**
 * Test REST API fallback
 */
async function testRestFallback() {
  console.log('\n=== Test 5: REST API Fallback ===');

  const connector = new HyperliquidConnector({
    restPollInterval: 1000
  });

  try {
    // Force REST fallback mode
    connector.useRestFallback = true;
    console.log('✓ Enabled REST fallback mode');

    // Subscribe to orderbook (should use REST)
    connector.subscriptions.add('BTC');
    connector.startRestPolling();
    console.log('✓ Started REST polling for BTC');

    // Wait for a few updates
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get bid/ask
    const bidAsk = connector.getBidAsk('BTC');
    if (bidAsk) {
      console.log('✓ BTC Bid/Ask via REST:', {
        bid: bidAsk.bid,
        ask: bidAsk.ask,
        timestamp: new Date(bidAsk.timestamp).toISOString()
      });
    } else {
      console.error('✗ No bid/ask data received via REST');
    }

    // Stop polling
    connector.stopRestPolling();
    console.log('✓ Stopped REST polling');

    return true;
  } catch (error) {
    console.error('✗ Test failed:', error);
    connector.stopRestPolling();
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('Starting Hyperliquid Connector Tests\n');

  const tests = [
    { name: 'Basic Connection', fn: testBasicConnection },
    { name: 'Orderbook Subscription', fn: testOrderbookSubscription },
    { name: 'Live Streaming', fn: testLiveStreaming },
    { name: 'Health Monitoring', fn: testHealthMonitoring },
    { name: 'REST Fallback', fn: testRestFallback }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`Error running test ${test.name}:`, error);
      results.push({ name: test.name, passed: false });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));

  let passedCount = 0;
  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.passed) passedCount++;
  }

  console.log('='.repeat(50));
  console.log(`Total: ${passedCount}/${results.length} tests passed`);
  console.log('='.repeat(50));
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runAllTests().catch(console.error);
}

export {
  testBasicConnection,
  testOrderbookSubscription,
  testLiveStreaming,
  testHealthMonitoring,
  testRestFallback,
  runAllTests
};
