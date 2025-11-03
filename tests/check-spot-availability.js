import HyperliquidConnector from '../hyperliquid.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Check which symbols are available on Hyperliquid Spot
 */

const SYMBOLS = ['BTC', 'ETH', 'PUMP', 'XPL', 'ENA', 'CRV'];

async function checkSpotAvailability() {
  console.log('='.repeat(80));
  console.log('Hyperliquid Spot Symbol Availability Check');
  console.log('='.repeat(80));
  console.log();

  const hyperliquid = new HyperliquidConnector({
    testnet: false
  });

  try {
    console.log('[INFO] Loading metadata...');
    await hyperliquid.getMeta(); // Load perp meta
    await hyperliquid.getSpotMeta(); // Load spot meta
    console.log('✅ Metadata loaded');
    console.log();

    console.log('[CHECK] Checking symbol availability...');
    console.log('-'.repeat(80));

    const availableSymbols = [];
    const unavailableSymbols = [];

    for (const symbol of SYMBOLS) {
      try {
        const assetId = await hyperliquid.getAssetId(symbol, true);
        const assetInfo = hyperliquid.getAssetInfo(symbol, assetId);
        availableSymbols.push({
          symbol,
          assetId,
          szDecimals: assetInfo.szDecimals
        });
        console.log(`✅ ${symbol.padEnd(6)} - Available (assetId: ${assetId}, szDecimals: ${assetInfo.szDecimals})`);
      } catch (error) {
        unavailableSymbols.push(symbol);
        console.log(`❌ ${symbol.padEnd(6)} - Not available on spot`);
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log(`Summary: ${availableSymbols.length}/${SYMBOLS.length} symbols available on spot`);
    console.log('='.repeat(80));

    if (availableSymbols.length > 0) {
      console.log('\nAvailable symbols:');
      availableSymbols.forEach(({ symbol, assetId, szDecimals }) => {
        console.log(`  - ${symbol} (assetId: ${assetId}, szDecimals: ${szDecimals})`);
      });
    }

    if (unavailableSymbols.length > 0) {
      console.log('\nUnavailable symbols:');
      unavailableSymbols.forEach(symbol => {
        console.log(`  - ${symbol}`);
      });
    }

    console.log();

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
  }

  process.exit(0);
}

// Run the check
checkSpotAvailability().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
