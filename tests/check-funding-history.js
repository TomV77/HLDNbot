import HyperliquidConnector from '../hyperliquid.js';
import { getFundingRatesWithHistory, sortByAnnualizedRate, fundingRatesWithHistoryToCSV } from '../utils/funding.js';
import fs from 'fs';

/**
 * Test script to check current funding rates with 7-day historical averages
 * Useful for delta-neutral strategy planning
 */

async function checkFundingHistory() {
  console.log('='.repeat(80));
  console.log('Hyperliquid Funding Rate Analysis - Current vs 7-Day Average');
  console.log('='.repeat(80));
  console.log();

  // Load config
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

  console.log(`[1/3] Loaded ${config.trading.pairs.length} pairs from config.json`);
  console.log(`       Pairs: ${config.trading.pairs.join(', ')}`);
  console.log();

  // Initialize connector
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  console.log('[2/3] Fetching current rates and 7-day funding history...');
  console.log('       (This may take a few seconds - fetching historical data)');
  console.log();

  // Fetch funding rates with history
  const results = await getFundingRatesWithHistory(hyperliquid, config.trading.pairs, {
    days: 7,
    verbose: true
  });

  console.log();
  console.log('[3/3] Funding Rate Analysis Results');
  console.log('='.repeat(80));

  // Check for errors
  const errors = results.filter(r => r.error || r.historyError);
  if (errors.length > 0) {
    console.log();
    console.log('❌ Errors:');
    for (const result of errors) {
      const error = result.error || result.historyError;
      console.log(`  ${result.symbol}: ${error}`);
    }
  }

  // Sort by current annualized rate (highest first)
  const sorted = sortByAnnualizedRate(results, true);

  if (sorted.length === 0) {
    console.log();
    console.log('⚠️  No valid funding rate data found');
    process.exit(1);
  }

  console.log();
  console.log('Current vs 7-Day Average Funding Rates (Ranked by Current - Highest First)');
  console.log('─'.repeat(80));
  console.log('Symbol      Current       7d Avg        7d Min        7d Max        vs Avg');
  console.log('            (Annual %)    (Annual %)    (Annual %)    (Annual %)    Change');
  console.log('─'.repeat(80));

  for (const result of sorted) {
    const currentAnnPct = (result.annualizedRate * 100).toFixed(2);

    if (result.history) {
      const avgAnnPct = (result.history.avg.annualized * 100).toFixed(2);
      const minAnnPct = (result.history.min.annualized * 100).toFixed(2);
      const maxAnnPct = (result.history.max.annualized * 100).toFixed(2);
      const vsAvgPct = result.history.vsCurrent.percentChange.toFixed(1);

      // Format with appropriate signs
      const currentSign = result.annualizedRate >= 0 ? '+' : '';
      const avgSign = result.history.avg.annualized >= 0 ? '+' : '';
      const minSign = result.history.min.annualized >= 0 ? '+' : '';
      const maxSign = result.history.max.annualized >= 0 ? '+' : '';
      const vsSign = result.history.vsCurrent.percentChange >= 0 ? '+' : '';

      // Indicator for above/below average
      const indicator = Math.abs(result.history.vsCurrent.percentChange) > 20
        ? (result.history.vsCurrent.percentChange > 0 ? ' 📈' : ' 📉')
        : '';

      console.log(
        `${result.symbol.padEnd(11)} ${currentSign}${currentAnnPct.padStart(8)}%  ` +
        `${avgSign}${avgAnnPct.padStart(8)}%  ` +
        `${minSign}${minAnnPct.padStart(8)}%  ` +
        `${maxSign}${maxAnnPct.padStart(8)}%  ` +
        `${vsSign}${vsAvgPct.padStart(6)}%${indicator}`
      );
    } else {
      console.log(`${result.symbol.padEnd(11)} ${currentSign}${currentAnnPct.padStart(8)}%  (no history)`);
    }
  }

  // Calculate overall statistics
  const validWithHistory = sorted.filter(r => r.history);

  if (validWithHistory.length > 0) {
    const avgCurrent = validWithHistory.reduce((sum, r) => sum + r.annualizedRate, 0) / validWithHistory.length;
    const avg7d = validWithHistory.reduce((sum, r) => sum + r.history.avg.annualized, 0) / validWithHistory.length;

    console.log();
    console.log('Overall Statistics:');
    console.log(`  Average Current Rate: ${(avgCurrent * 100).toFixed(2)}% annualized`);
    console.log(`  Average 7-Day Rate:   ${(avg7d * 100).toFixed(2)}% annualized`);
    console.log(`  Trend: ${avgCurrent > avg7d ? 'Increasing 📈' : avgCurrent < avg7d ? 'Decreasing 📉' : 'Stable'} (${((avgCurrent - avg7d) / avg7d * 100).toFixed(1)}% vs 7d avg)`);
    console.log();

    // Find most stable and most volatile
    const volatilities = validWithHistory.map(r => ({
      symbol: r.symbol,
      range: r.history.max.annualized - r.history.min.annualized,
      rangePct: (r.history.max.annualized - r.history.min.annualized) * 100
    }));

    volatilities.sort((a, b) => a.range - b.range);
    const mostStable = volatilities[0];
    const mostVolatile = volatilities[volatilities.length - 1];

    console.log('Funding Rate Stability (7-day range):');
    console.log(`  Most Stable:  ${mostStable.symbol} (range: ${mostStable.rangePct.toFixed(2)}%)`);
    console.log(`  Most Volatile: ${mostVolatile.symbol} (range: ${mostVolatile.rangePct.toFixed(2)}%)`);
    console.log();

    // Delta-neutral strategy recommendations
    console.log('💡 Delta-Neutral Strategy Insights:');
    console.log();

    // Find best funding opportunities (high and stable)
    const opportunities = validWithHistory.map(r => ({
      symbol: r.symbol,
      avgAnnualized: r.history.avg.annualized,
      currentAnnualized: r.annualizedRate,
      stability: 1 / (r.history.max.annualized - r.history.min.annualized), // Higher = more stable
      score: r.history.avg.annualized / (r.history.max.annualized - r.history.min.annualized)
    }));

    opportunities.sort((a, b) => b.score - a.score);

    console.log('  Top 3 Opportunities (High Funding + Stability):');
    for (let i = 0; i < Math.min(3, opportunities.length); i++) {
      const opp = opportunities[i];
      const annPct = (opp.avgAnnualized * 100).toFixed(2);
      console.log(`    ${i + 1}. ${opp.symbol}: ${annPct}% avg funding (stable)`);
    }

    console.log();
    console.log('  Strategy: SHORT PERP + LONG SPOT to earn funding');
    console.log('  Note: All current rates are positive (longs pay shorts)');
    console.log();
  }

  // Export to CSV
  const csvContent = fundingRatesWithHistoryToCSV(sorted);
  fs.writeFileSync('./funding-rates-history.csv', csvContent, 'utf8');

  console.log('✅ Exported detailed funding analysis to funding-rates-history.csv');
  console.log();
  console.log('='.repeat(80));

  process.exit(0);
}

checkFundingHistory().catch(error => {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
