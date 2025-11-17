import HyperliquidConnector from '../hyperliquid.js';
import { getFundingRates, sortByAnnualizedRate, fundingRatesToCSV, filterByAnnualizedRate, getCombinedFundingRates } from '../utils/funding.js';
import fs from 'fs';

/**
 * Test script to check PREDICTED and current funding rates for configured perpetual symbols
 * and export results ranked by annualized rate
 *
 * CRITICAL: Now displays PREDICTED funding rates (what will be paid NEXT), not just historical
 */

async function checkFundingRates() {
  console.log('='.repeat(80));
  console.log('Hyperliquid Funding Rate Check (Current + Predicted)');
  console.log('='.repeat(80));
  console.log();

  // Load config
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

  console.log(`[1/3] Loaded ${config.trading.pairs.length} pairs from config.json`);
  console.log(`       Pairs: ${config.trading.pairs.join(', ')}`);
  console.log();

  // Initialize connector
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  console.log('[2/3] Fetching current and PREDICTED funding rates...');
  console.log();

  // Fetch combined funding rates (current + predicted)
  const results = await getCombinedFundingRates(hyperliquid, config.trading.pairs, {
    verbose: true
  });

  console.log();
  console.log('[3/3] Funding Rate Results');
  console.log('='.repeat(80));

  // Check for errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log();
    console.log('❌ Errors:');
    for (const result of errors) {
      console.log(`  ${result.symbol}: ${result.error}`);
    }
  }

  // Sort by predicted annualized rate (highest first) - this is what matters for trading decisions!
  const validResults = results.filter(r => !r.error && (r.predictedAnnualizedRate !== null || r.currentAnnualizedRate !== null));
  const sorted = validResults.sort((a, b) => {
    const aRate = a.predictedAnnualizedRate !== null ? a.predictedAnnualizedRate : a.currentAnnualizedRate;
    const bRate = b.predictedAnnualizedRate !== null ? b.predictedAnnualizedRate : b.currentAnnualizedRate;
    return bRate - aRate;  // Highest first
  });

  if (sorted.length === 0) {
    console.log();
    console.log('⚠️  No valid funding rate data found');
    process.exit(1);
  }

  console.log();
  console.log('Funding Rates (Ranked by PREDICTED Rate - Highest First)');
  console.log('─'.repeat(100));
  console.log('Symbol      Current (Hourly)   Current (APY)    PREDICTED (Hourly)  PREDICTED (APY)  Change');
  console.log('─'.repeat(100));

  for (const result of sorted) {
    const currHourlyPct = result.currentFundingRate !== null ? (result.currentFundingRate * 100).toFixed(6) : 'N/A';
    const currAnnualPct = result.currentAnnualizedRate !== null ? (result.currentAnnualizedRate * 100).toFixed(2) : 'N/A';
    const predHourlyPct = result.predictedFundingRate !== null ? (result.predictedFundingRate * 100).toFixed(6) : 'N/A';
    const predAnnualPct = result.predictedAnnualizedRate !== null ? (result.predictedAnnualizedRate * 100).toFixed(2) : 'N/A';

    // Calculate change
    let changeStr = 'N/A';
    if (result.annualizedRateChange !== null) {
      const changePct = result.annualizedRateChange * 100;
      const sign = changePct >= 0 ? '+' : '';
      changeStr = `${sign}${changePct.toFixed(2)}%`;
    }

    // Format with padding
    console.log(
      `${result.symbol.padEnd(11)} ` +
      `${String(currHourlyPct).padStart(10)}%  ` +
      `${String(currAnnualPct).padStart(10)}%  ` +
      `${String(predHourlyPct).padStart(10)}%     ` +
      `${String(predAnnualPct).padStart(10)}%      ` +
      `${changeStr.padStart(8)}`
    );
  }

  // Calculate statistics based on PREDICTED rates
  const predictedRates = sorted
    .filter(r => r.predictedAnnualizedRate !== null)
    .map(r => r.predictedAnnualizedRate);

  if (predictedRates.length > 0) {
    const avgPredicted = predictedRates.reduce((sum, r) => sum + r, 0) / predictedRates.length;
    const avgPredictedPct = (avgPredicted * 100).toFixed(2);

    console.log();
    console.log('Statistics (PREDICTED rates):');
    console.log(`  Average PREDICTED APY: ${avgPredicted >= 0 ? '+' : ''}${avgPredictedPct}%`);
    console.log(`  Highest PREDICTED: ${sorted[0].symbol} at ${(sorted[0].predictedAnnualizedRate * 100).toFixed(2)}%`);
    console.log(`  Lowest PREDICTED:  ${sorted[sorted.length - 1].symbol} at ${(sorted[sorted.length - 1].predictedAnnualizedRate * 100).toFixed(2)}%`);
    console.log();

    // Show symbols with significant changes
    const significantChanges = sorted.filter(r => r.annualizedRateChange !== null && Math.abs(r.annualizedRateChange * 100) > 1);
    if (significantChanges.length > 0) {
      console.log('⚠️  Significant Changes (> 1% APY):');
      for (const result of significantChanges) {
        const changePct = (result.annualizedRateChange * 100).toFixed(2);
        const sign = result.annualizedRateChange >= 0 ? '+' : '';
        console.log(`  ${result.symbol}: ${sign}${changePct}% (Current: ${(result.currentAnnualizedRate * 100).toFixed(2)}% → Predicted: ${(result.predictedAnnualizedRate * 100).toFixed(2)}%)`);
      }
      console.log();
    }
  }

  console.log('💡 NOTE: PREDICTED rates show what will be paid in the NEXT funding period.');
  console.log('💡 Trading decisions should be based on PREDICTED rates, not current rates.');
  console.log();

  console.log('✅ Exported funding rates to funding-rates.csv');
  console.log();
  console.log('='.repeat(80));

  process.exit(0);
}

checkFundingRates().catch(error => {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
