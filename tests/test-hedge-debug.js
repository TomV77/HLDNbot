import HyperliquidConnector from '../hyperliquid.js';
import { getPerpPositions, getSpotBalances, analyzeDeltaNeutral } from '../utils/positions.js';

async function test() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });
  await hyperliquid.connect();

  console.log('Fetching positions...');
  const [perpPositions, spotBalances] = await Promise.all([
    getPerpPositions(hyperliquid, null, { verbose: false }),
    getSpotBalances(hyperliquid, null, { verbose: false })
  ]);

  console.log('\nSPOT Balances:');
  for (const spot of spotBalances) {
    console.log(`  ${spot.symbol}: ${spot.total}`);
  }

  console.log('\nAnalyzing delta-neutral...');
  const analysis = analyzeDeltaNeutral(perpPositions, spotBalances);

  console.log(`\nUnmatched SPOT: ${analysis.unmatchedSpot.length}`);
  for (const spot of analysis.unmatchedSpot) {
    console.log(`  ${spot.symbol}: ${spot.total}`);
  }

  console.log('\nFetching prices...');
  const allMids = await hyperliquid.getAllMids();
  const priceMap = {};
  for (const [symbol, priceStr] of Object.entries(allMids)) {
    priceMap[symbol] = parseFloat(priceStr);
  }

  console.log('\nChecking price lookup for each unmatched SPOT:');
  for (const spotPos of analysis.unmatchedSpot) {
    const perpSymbol = HyperliquidConnector.spotToPerp(spotPos.symbol);
    const price = priceMap[perpSymbol] || 0;
    const spotSize = spotPos.balance?.total || spotPos.total || 0;
    const value = spotSize * price;

    console.log(`\n  SPOT symbol: ${spotPos.symbol}`);
    console.log(`  Balance object:`, JSON.stringify(spotPos.balance, null, 2));
    console.log(`  Spot size: ${spotSize}`);
    console.log(`  PERP symbol (converted): ${perpSymbol}`);
    console.log(`  Price from map: ${price}`);
    console.log(`  Value USD: $${value.toFixed(2)}`);
    console.log(`  Above $1 threshold: ${value >= 1}`);
  }

  hyperliquid.disconnect();
}

test().catch(console.error);
