import HyperliquidConnector from '../hyperliquid.js';
import { getAllPositions, analyzeDeltaNeutral, positionsToCSV, deltaNeutralToCSV } from '../utils/positions.js';
import fs from 'fs';

/**
 * Test script to check PERP and SPOT positions
 * and identify delta-neutral hedges
 */

async function checkPositions() {
  console.log('='.repeat(80));
  console.log('Hyperliquid Position Analysis - PERP & SPOT');
  console.log('='.repeat(80));
  console.log();

  // Initialize connector
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  if (!hyperliquid.wallet) {
    console.error('❌ Error: Wallet address not configured');
    console.error('   Please set HL_WALLET in .env file');
    process.exit(1);
  }

  console.log(`[1/3] Checking positions for wallet: ${hyperliquid.wallet}`);
  console.log();

  // Fetch positions
  console.log('[2/3] Fetching PERP positions and SPOT balances...');
  const positions = await getAllPositions(hyperliquid, null, { verbose: true });
  console.log();

  // Display PERP positions
  console.log('[3/3] Position Analysis Results');
  console.log('='.repeat(80));
  console.log();

  if (positions.perp.length === 0) {
    console.log('📊 PERP Positions: None');
  } else {
    console.log(`📊 PERP Positions (${positions.perp.length})`);
    console.log('─'.repeat(80));
    console.log('Symbol      Side     Size           Entry Price   Position Value   Unreal. PnL   ROE %');
    console.log('─'.repeat(80));

    for (const pos of positions.perp) {
      const sizeStr = pos.size.toFixed(6).padStart(13);
      const entryStr = pos.entryPrice.toFixed(2).padStart(12);
      const valueStr = pos.positionValue.toFixed(2).padStart(15);
      const pnlStr = pos.unrealizedPnl.toFixed(2).padStart(12);
      const roeStr = pos.returnOnEquity.toFixed(2).padStart(6);

      // Add indicator for profit/loss
      const pnlIndicator = pos.unrealizedPnl > 0 ? '✅' : pos.unrealizedPnl < 0 ? '❌' : '  ';

      console.log(
        `${pos.symbol.padEnd(11)} ${pos.side.padEnd(8)} ${sizeStr}   $${entryStr}   $${valueStr}   $${pnlStr} ${pnlIndicator}  ${roeStr}%`
      );
    }

    // Calculate totals
    const totalValue = positions.perp.reduce((sum, p) => sum + p.positionValue, 0);
    const totalPnl = positions.perp.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalMargin = positions.perp.reduce((sum, p) => sum + p.marginUsed, 0);

    console.log('─'.repeat(80));
    console.log(`Total Position Value: $${totalValue.toFixed(2)}`);
    console.log(`Total Unrealized PnL: $${totalPnl.toFixed(2)} ${totalPnl > 0 ? '✅' : totalPnl < 0 ? '❌' : ''}`);
    console.log(`Total Margin Used: $${totalMargin.toFixed(2)}`);
  }

  console.log();

  // Display SPOT balances
  if (positions.spot.length === 0) {
    console.log('💰 SPOT Balances: None (excluding USDC)');
  } else {
    console.log(`💰 SPOT Balances (${positions.spot.length}, excluding USDC)`);
    console.log('─'.repeat(80));
    console.log('Symbol      Total Amount      Hold Amount       Available');
    console.log('─'.repeat(80));

    for (const bal of positions.spot) {
      const totalStr = bal.total.toFixed(6).padStart(16);
      const holdStr = bal.hold.toFixed(6).padStart(16);
      const availStr = bal.available.toFixed(6).padStart(16);

      console.log(
        `${bal.symbol.padEnd(11)} ${totalStr}   ${holdStr}   ${availStr}`
      );
    }
  }

  console.log();
  console.log('='.repeat(80));

  // Analyze delta-neutral positions
  if (positions.perp.length === 0 && positions.spot.length === 0) {
    console.log();
    console.log('ℹ️  No positions found. Start trading to see delta-neutral analysis.');
  } else {
    console.log();
    console.log('🔄 Delta-Neutral Analysis');
    console.log('─'.repeat(80));

    const analysis = analyzeDeltaNeutral(positions.perp, positions.spot);

    if (analysis.deltaNeutralPairs.length === 0) {
      console.log('No matching PERP/SPOT pairs found');
    } else {
      console.log(`Found ${analysis.deltaNeutralPairs.length} matched PERP/SPOT pair(s):`);
      console.log();

      for (const pair of analysis.deltaNeutralPairs) {
        console.log(`${pair.symbol}:`);
        console.log(`  PERP: ${pair.perpSide} ${pair.perpSize.toFixed(6)}`);
        console.log(`  SPOT: ${pair.spotSize.toFixed(6)}`);
        console.log(`  Hedge Ratio: ${pair.hedgeRatio.toFixed(4)} (${pair.hedgeRatio > 1 ? 'over' : pair.hedgeRatio < 1 ? 'under' : 'perfect'} hedged)`);
        console.log(`  Size Mismatch: ${pair.sizeMismatch.toFixed(6)} (${pair.sizeMismatchPct.toFixed(2)}%)`);

        // Determine hedge status
        if (pair.isDeltaNeutral) {
          let indicator;
          if (pair.hedgeQuality === 'PERFECT') {
            indicator = '✅ PERFECT HEDGE';
          } else if (pair.hedgeQuality === 'GOOD') {
            indicator = '✅ GOOD HEDGE';
          } else if (pair.hedgeQuality === 'PARTIAL') {
            indicator = '⚠️  PARTIAL HEDGE';
          } else {
            indicator = '⚠️  WEAK HEDGE';
          }
          console.log(`  Status: ${indicator} (${pair.perpSide} perp + ${pair.spotSize > 0 ? 'LONG' : 'SHORT'} spot)`);
        } else {
          console.log(`  Status: ❌ NOT DELTA-NEUTRAL (same direction)`);
        }

        // Calculate implied funding earned
        if (pair.isDeltaNeutral && pair.perpSide === 'SHORT') {
          console.log(`  Strategy: Earning positive funding (shorts receive payments)`);
        } else if (pair.isDeltaNeutral && pair.perpSide === 'LONG') {
          console.log(`  Strategy: Paying negative funding (longs pay shorts) - not optimal`);
        }

        console.log();
      }

      // Summary
      console.log('─'.repeat(80));
      console.log('Summary:');
      console.log(`  Perfect Hedges: ${analysis.perfectHedges} (mismatch < 5%)`);
      console.log(`  Good Hedges: ${analysis.goodHedges} (mismatch < 15%)`);
      console.log(`  Has Delta-Neutral Positions: ${analysis.hasDeltaNeutral ? '✅ YES' : '❌ NO'}`);
    }

    // Display unmatched positions
    if (analysis.unmatchedPerp.length > 0) {
      console.log();
      console.log(`⚠️  Unmatched PERP Positions (${analysis.unmatchedPerp.length}):`);
      for (const pos of analysis.unmatchedPerp) {
        console.log(`  ${pos.symbol}: ${pos.side} ${pos.size.toFixed(6)} (no corresponding spot balance)`);
      }
    }

    if (analysis.unmatchedSpot.length > 0) {
      console.log();
      console.log(`⚠️  Unmatched SPOT Balances (${analysis.unmatchedSpot.length}):`);
      for (const spot of analysis.unmatchedSpot) {
        console.log(`  ${spot.symbol}: ${spot.balance.total.toFixed(6)} (no corresponding perp position)`);
      }
    }

    // Export to CSV
    console.log();
    console.log('─'.repeat(80));

    // Export positions
    const positionsCSV = positionsToCSV(positions.perp, positions.spot);
    fs.writeFileSync('./positions.csv', positionsCSV, 'utf8');
    console.log('✅ Exported positions to positions.csv');

    // Export delta-neutral analysis if pairs exist
    if (analysis.deltaNeutralPairs.length > 0) {
      const deltaNeutralCSV = deltaNeutralToCSV(analysis);
      fs.writeFileSync('./delta-neutral.csv', deltaNeutralCSV, 'utf8');
      console.log('✅ Exported delta-neutral analysis to delta-neutral.csv');
    }
  }

  console.log();
  console.log('='.repeat(80));

  process.exit(0);
}

checkPositions().catch(error => {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
