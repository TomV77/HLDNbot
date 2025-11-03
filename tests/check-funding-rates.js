import HyperliquidConnector from '../hyperliquid.js';
import { getFundingRates, sortByAnnualizedRate, fundingRatesToCSV, filterByAnnualizedRate } from '../utils/funding.js';
import fs from 'fs';

/**
 * Test script to check current funding rates for configured perpetual symbols
 * and export results ranked by annualized rate
 */

async function checkFundingRates() {
  console.log('='.repeat(80));
  console.log('Hyperliquid Funding Rate Check');
  console.log('='.repeat(80));
  console.log();

  // Load config
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

  console.log(`[1/3] Loaded ${config.trading.pairs.length} pairs from config.json`);
  console.log(`       Pairs: ${config.trading.pairs.join(', ')}`);
  console.log();

  // Initialize connector
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  console.log('[2/3] Fetching current funding rates...');
  console.log();

  // Fetch funding rates
  const results = await getFundingRates(hyperliquid, config.trading.pairs, {
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

  // Sort by annualized rate (highest first)
  const sorted = sortByAnnualizedRate(results, true);

  if (sorted.length === 0) {
    console.log();
    console.log('⚠️  No valid funding rate data found');
    process.exit(1);
  }

  console.log();
  console.log('Funding Rates (Ranked by Annualized Rate - Highest First)');
  console.log('─'.repeat(80));
  console.log('Symbol      Hourly Rate        Annualized Rate    Direction');
  console.log('─'.repeat(80));

  for (const result of sorted) {
    const hourlyPct = (result.fundingRate * 100).toFixed(6);
    const annualizedPct = (result.annualizedRate * 100).toFixed(2);

    // Determine direction and sign
    let direction;
    let sign;
    if (result.fundingRate > 0) {
      direction = 'Longs pay shorts';
      sign = '+';
    } else if (result.fundingRate < 0) {
      direction = 'Shorts pay longs';
      sign = '';
    } else {
      direction = 'Neutral';
      sign = ' ';
    }

    console.log(
      `${result.symbol.padEnd(11)} ${sign}${hourlyPct.padStart(10)}%    ${sign}${annualizedPct.padStart(10)}%    ${direction}`
    );
  }

  // Calculate statistics
  const avgAnnualized = sorted.reduce((sum, r) => sum + r.annualizedRate, 0) / sorted.length;
  const avgAnnualizedPct = (avgAnnualized * 100).toFixed(2);

  const maxRate = sorted[0]; // Highest (most positive)
  const minRate = sorted[sorted.length - 1]; // Lowest (most negative)

  console.log();
  console.log('Statistics:');
  console.log(`  Average Annualized Rate: ${avgAnnualized >= 0 ? '+' : ''}${avgAnnualizedPct}%`);
  console.log(`  Highest Rate: ${maxRate.symbol} at +${(maxRate.annualizedRate * 100).toFixed(2)}%`);
  console.log(`  Lowest Rate:  ${minRate.symbol} at ${(minRate.annualizedRate * 100).toFixed(2)}%`);
  console.log();

  // Filter by high/low threshold (e.g., 10% annualized)
  const HIGH_FUNDING_THRESHOLD = 10; // 10% annualized
  const { high, low } = filterByAnnualizedRate(sorted, HIGH_FUNDING_THRESHOLD);

  if (high.length > 0) {
    console.log(`⚠️  High Funding Rates (|annualized| >= ${HIGH_FUNDING_THRESHOLD}%):`);
    for (const result of high) {
      const annualizedPct = (result.annualizedRate * 100).toFixed(2);
      const direction = result.fundingRate > 0 ? 'LONG position pays' : 'SHORT position pays';
      console.log(`  ${result.symbol}: ${result.annualizedRate >= 0 ? '+' : ''}${annualizedPct}% (${direction})`);
    }
    console.log();
  }

  // Export to CSV
  const csvContent = fundingRatesToCSV(sorted);
  fs.writeFileSync('./funding-rates.csv', csvContent, 'utf8');

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
