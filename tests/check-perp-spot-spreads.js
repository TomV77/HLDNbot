import HyperliquidConnector from '../hyperliquid.js';
import fs from 'fs';
import {
  getPerpSpotSpreads,
  filterByPerpSpotSpread,
  formatPerpSpotSpreadTable,
  perpSpotSpreadToCSV
} from '../utils/arbitrage.js';

/**
 * Check PERP-SPOT mid price spreads for all pairs in config.json
 * Shows warnings for spreads that may indicate arbitrage opportunities or price dislocations
 */

async function checkPerpSpotSpreads() {
  console.log('='.repeat(100));
  console.log('PERP-SPOT Mid Price Spread Check');
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

  // Fetch PERP-SPOT spreads
  console.log('[STEP 2] Fetching PERP-SPOT mid price spreads...');
  console.log();

  const results = await getPerpSpotSpreads(hyperliquid, config.trading.pairs, {
    verbose: true,
    config: config
  });

  console.log();
  console.log('[STEP 3] Results Summary');
  console.log('='.repeat(100));
  console.log();

  // Print results table
  console.log(formatPerpSpotSpreadTable(results));
  console.log();

  // Filter by spread threshold (use a default of 0.5% for PERP-SPOT spreads)
  // PERP-SPOT spreads are typically wider than bid-ask spreads
  const PERP_SPOT_SPREAD_THRESHOLD = config.thresholds?.maxPerpSpotSpreadPercent || 0.5;
  const { wideSpread, narrowSpread } = filterByPerpSpotSpread(results, PERP_SPOT_SPREAD_THRESHOLD);

  // Show warnings for wide spreads
  if (wideSpread.length > 0) {
    console.log(`⚠️  Wide PERP-SPOT Spread Warnings (> ${PERP_SPOT_SPREAD_THRESHOLD}%):`)
    console.log();

    for (const result of wideSpread) {
      const sign = result.spreadPercent >= 0 ? '+' : '';
      const premiumText = result.isPremium ? 'SPOT trading at premium' : 'SPOT trading at discount';
      console.log(`  ${result.perpSymbol}:`);
      console.log(`    ⚠️  ${sign}${result.spreadPercent.toFixed(4)}% (${premiumText})`);
      console.log(`    PERP mid: $${result.perpMid.toFixed(6)}`);
      console.log(`    SPOT mid: $${result.spotMid.toFixed(6)}`);
      console.log(`    Absolute difference: $${result.spreadAbs.toFixed(6)}`);
      console.log();
    }
    console.log(`  Total warnings: ${wideSpread.length}`);
    console.log();
  }

  // Show normal spreads
  console.log(`✅ Normal Spreads (≤ ${PERP_SPOT_SPREAD_THRESHOLD}%): ${narrowSpread.length} pairs`);
  if (narrowSpread.length > 0) {
    for (const result of narrowSpread) {
      const sign = result.spreadPercent >= 0 ? '+' : '';
      const premiumText = result.isPremium ? '(spot premium)' : '(spot discount)';
      console.log(`  ✅ ${result.perpSymbol}: ${sign}${result.spreadPercent.toFixed(4)}% ${premiumText}`);
    }
  }
  console.log();

  // Calculate average spreads
  const validResults = results.filter(r => r.spreadPercent !== null && !r.error);

  if (validResults.length > 0) {
    const avgSpread = validResults.reduce((sum, r) => sum + Math.abs(r.spreadPercent), 0) / validResults.length;
    const avgSpreadSigned = validResults.reduce((sum, r) => sum + r.spreadPercent, 0) / validResults.length;
    console.log(`Average PERP-SPOT spread (absolute): ${avgSpread.toFixed(4)}%`);
    console.log(`Average PERP-SPOT spread (signed): ${avgSpreadSigned >= 0 ? '+' : ''}${avgSpreadSigned.toFixed(4)}%`);

    const premiumCount = validResults.filter(r => r.isPremium).length;
    const discountCount = validResults.length - premiumCount;
    console.log(`Spot premium pairs: ${premiumCount}, Spot discount pairs: ${discountCount}`);
  }
  console.log();

  // Write to CSV file
  const csvContent = perpSpotSpreadToCSV(results);
  fs.writeFileSync('./perp-spot-spreads.csv', csvContent, 'utf8');
  console.log('✅ Results saved to perp-spot-spreads.csv');

  console.log();
  console.log('='.repeat(100));
  console.log('✅ PERP-SPOT spread check completed');
  console.log('='.repeat(100));

  process.exit(0);
}

checkPerpSpotSpreads().catch(error => {
  console.error('❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
