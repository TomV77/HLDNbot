import HyperliquidConnector from '../hyperliquid.js';
import fs from 'fs';
import {
  getBidAskSpreads,
  filterBySpread,
  formatSpreadTable,
  spreadToCSV
} from '../utils/spread.js';

/**
 * Check bid-ask spreads for all pairs in config.json
 * Shows warnings for spreads > 0.15%
 */

async function checkSpreads() {
  console.log('='.repeat(100));
  console.log('Bid-Ask Spread Check');
  console.log('='.repeat(100));
  console.log();

  // Load config
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  // Load metadata once
  console.log('[STEP 1] Loading market metadata...');
  await hyperliquid.getMeta();
  await hyperliquid.getSpotMeta();
  console.log('✅ Metadata loaded');
  console.log();

  // Fetch all spreads using utils (rate limits from config)
  console.log('[STEP 2] Fetching bid-ask spreads (parallel with rate limiting)...');
  console.log(`  Using rate limits: ${config.rateLimit.maxConcurrentRequests} concurrent, ${config.rateLimit.delayBetweenBatches}ms delay`);
  console.log();

  const results = await getBidAskSpreads(hyperliquid, config.trading.pairs, {
    verbose: true,
    config: config
  });

  console.log();
  console.log('[STEP 3] Results Summary');
  console.log('='.repeat(100));
  console.log();

  // Print results table
  console.log(formatSpreadTable(results));
  console.log();

  // Filter by spread threshold (from config)
  const SPREAD_THRESHOLD = config.thresholds.maxSpreadPercent;
  const { wideSpread, narrowSpread } = filterBySpread(results, SPREAD_THRESHOLD);

  // Count by market
  const widePerpCount = wideSpread.filter(r => !r.isSpot).length;
  const wideSpotCount = wideSpread.filter(r => r.isSpot).length;

  // Show warnings for wide spreads
  if (wideSpread.length > 0) {
    console.log(`⚠️  Wide Spread Warnings (> ${SPREAD_THRESHOLD}%):`);
    console.log();

    // Group by symbol
    const bySymbol = {};
    for (const result of wideSpread) {
      if (!bySymbol[result.symbol]) {
        bySymbol[result.symbol] = { perp: null, spot: null };
      }
      if (result.isSpot) {
        bySymbol[result.symbol].spot = result;
      } else {
        bySymbol[result.symbol].perp = result;
      }
    }

    for (const [symbol, data] of Object.entries(bySymbol)) {
      console.log(`  ${symbol}:`);
      if (data.perp) {
        console.log(`    ⚠️  PERP: ${data.perp.spreadPercent.toFixed(4)}% (bid: $${data.perp.bid.toFixed(6)}, ask: $${data.perp.ask.toFixed(6)})`);
      }
      if (data.spot) {
        console.log(`    ⚠️  SPOT: ${data.spot.spreadPercent.toFixed(4)}% (bid: $${data.spot.bid.toFixed(6)}, ask: $${data.spot.ask.toFixed(6)})`);
      }
    }
    console.log();
    console.log(`  Total warnings: ${wideSpread.length} (${widePerpCount} perp, ${wideSpotCount} spot)`);
    console.log();
  }

  // Show good spreads
  const narrowPerpCount = narrowSpread.filter(r => !r.isSpot).length;
  const narrowSpotCount = narrowSpread.filter(r => r.isSpot).length;

  console.log(`✅ Good Spreads (≤ ${SPREAD_THRESHOLD}%): ${narrowSpread.length} pairs (${narrowPerpCount} perp, ${narrowSpotCount} spot)`);
  if (narrowSpread.length > 0) {
    // Group by symbol
    const bySymbol = {};
    for (const result of narrowSpread) {
      if (!bySymbol[result.symbol]) {
        bySymbol[result.symbol] = { perp: null, spot: null };
      }
      if (result.isSpot) {
        bySymbol[result.symbol].spot = result;
      } else {
        bySymbol[result.symbol].perp = result;
      }
    }

    for (const [symbol, data] of Object.entries(bySymbol)) {
      const perpSpread = data.perp ? data.perp.spreadPercent.toFixed(4) + '%' : 'N/A';
      const spotSpread = data.spot ? data.spot.spreadPercent.toFixed(4) + '%' : 'N/A';
      console.log(`  ✅ ${symbol}: PERP ${perpSpread}, SPOT ${spotSpread}`);
    }
  }
  console.log();

  // Calculate average spreads
  const validResults = results.filter(r => r.spreadPercent !== null && !r.error);
  const perpResults = validResults.filter(r => !r.isSpot);
  const spotResults = validResults.filter(r => r.isSpot);

  if (perpResults.length > 0) {
    const avgPerpSpread = perpResults.reduce((sum, r) => sum + r.spreadPercent, 0) / perpResults.length;
    console.log(`Average PERP spread: ${avgPerpSpread.toFixed(4)}%`);
  }

  if (spotResults.length > 0) {
    const avgSpotSpread = spotResults.reduce((sum, r) => sum + r.spreadPercent, 0) / spotResults.length;
    console.log(`Average SPOT spread: ${avgSpotSpread.toFixed(4)}%`);
  }
  console.log();

  // Write to CSV file
  const csvContent = spreadToCSV(results);
  fs.writeFileSync('./spreads.csv', csvContent, 'utf8');
  console.log('✅ Results saved to spreads.csv');

  console.log();
  console.log('='.repeat(100));
  console.log('✅ Spread check completed');
  console.log('='.repeat(100));

  process.exit(0);
}

checkSpreads().catch(error => {
  console.error('❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
