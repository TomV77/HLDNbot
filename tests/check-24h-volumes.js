import HyperliquidConnector from '../hyperliquid.js';
import fs from 'fs';
import {
  get24HourVolumes,
  filterByVolume,
  calculateTotalVolumes,
  formatVolumeTable,
  toCSV,
  convertVolumesToUSDC,
  filterByVolumeUSDC
} from '../utils/volume.js';

/**
 * Check 24-hour trading volumes for all pairs in config.json
 * Shows both PERP and SPOT volumes for comparison
 */

async function check24HVolumes() {
  console.log('='.repeat(100));
  console.log('24-Hour Trading Volume Check');
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

  // Fetch all volumes using utils (rate limits from config)
  console.log('[STEP 2] Fetching 24-hour volumes (parallel with rate limiting)...');
  console.log(`  Using rate limits: ${config.rateLimit.maxConcurrentRequests} concurrent, ${config.rateLimit.delayBetweenBatches}ms delay`);
  console.log();

  const results = await get24HourVolumes(hyperliquid, config.trading.pairs, {
    verbose: true,
    config: config  // Pass config for centralized rate limiting
  });

  console.log();
  console.log('[STEP 3] Converting volumes to USDC using current prices...');

  // Convert volumes to USDC
  const resultsWithUSDC = await convertVolumesToUSDC(hyperliquid, results);
  console.log('✅ Volumes converted to USDC');
  console.log();
  console.log('[STEP 4] Results Summary');
  console.log('='.repeat(100));
  console.log();

  // Print results table (coin units)
  console.log(formatVolumeTable(results));
  console.log();

  // Calculate totals (coin units)
  const totals = calculateTotalVolumes(results);
  console.log('Summary (in coin units):');
  console.log(`  Total PERP volume (${totals.perpCount} pairs): ${totals.totalPerpVolume.toFixed(4)}`);
  console.log(`  Total SPOT volume (${totals.spotCount} pairs): ${totals.totalSpotVolume.toFixed(4)}`);
  console.log();

  // Check for low combined volume pairs (using threshold from config)
  const VOLUME_THRESHOLD = config.thresholds.minVolumeUSDC;
  const volumeThresholdM = (VOLUME_THRESHOLD / 1e6).toFixed(0); // For display

  const lowVolumePairs = resultsWithUSDC.filter(r =>
    r.price !== null && r.totalVolUSDC < VOLUME_THRESHOLD
  );
  const highVolumePairs = resultsWithUSDC.filter(r =>
    r.price !== null && r.totalVolUSDC >= VOLUME_THRESHOLD
  );

  // Show warnings for low volume pairs
  if (lowVolumePairs.length > 0) {
    console.log(`⚠️  Low Volume Warnings (combined SPOT+PERP < $${volumeThresholdM}M USDC):`);
    for (const pair of lowVolumePairs) {
      const totalStr = (pair.totalVolUSDC / 1e6).toFixed(2); // Show in millions
      const perpStr = (pair.perpVolUSDC / 1e6).toFixed(2);
      const spotStr = (pair.spotVolUSDC / 1e6).toFixed(2);
      console.log(`  ⚠️  ${pair.perpSymbol}: $${totalStr}M total ($${perpStr}M perp + $${spotStr}M spot) @ $${pair.price.toFixed(2)}`);
    }
    console.log();
  }

  // Show high volume pairs
  console.log(`✅ High Volume Pairs (combined SPOT+PERP ≥ $${volumeThresholdM}M USDC): ${highVolumePairs.length} pairs`);
  if (highVolumePairs.length > 0) {
    for (const pair of highVolumePairs) {
      const totalStr = (pair.totalVolUSDC / 1e6).toFixed(2); // Show in millions
      const perpStr = (pair.perpVolUSDC / 1e6).toFixed(2);
      const spotStr = (pair.spotVolUSDC / 1e6).toFixed(2);
      console.log(`  ✅ ${pair.perpSymbol}: $${totalStr}M total ($${perpStr}M perp + $${spotStr}M spot) @ $${pair.price.toFixed(2)}`);
    }
  }
  console.log();

  // Write to CSV file
  const csvContent = toCSV(results);
  fs.writeFileSync('./24h-volumes.csv', csvContent, 'utf8');
  console.log('✅ Results saved to 24h-volumes.csv');

  console.log();
  console.log('='.repeat(100));
  console.log('✅ 24-hour volume check completed');
  console.log('='.repeat(100));

  process.exit(0);
}

check24HVolumes().catch(error => {
  console.error('❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
