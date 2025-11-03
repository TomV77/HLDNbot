import HyperliquidConnector from '../hyperliquid.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkMinOrderSize() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  await hyperliquid.getSpotMeta();

  console.log('=== SPOT METADATA ===\n');

  const tokens = ['UBTC', 'UETH', 'UPUMP', 'UXPL'];

  for (const token of tokens) {
    try {
      const assetId = await hyperliquid.getAssetId(token, true);
      const spotIndex = assetId - 10000;
      const pair = hyperliquid.spotMetaCache.universe[spotIndex];

      console.log(`${token}:`);
      console.log(`  Asset ID: ${assetId}`);
      console.log(`  Spot Index: ${spotIndex}`);
      console.log(`  Pair name: ${pair.name}`);
      console.log(`  Tokens: ${JSON.stringify(pair.tokens)}`);
      console.log(`  Index: ${pair.index}`);

      // Get base token info
      const baseTokenIndex = pair.tokens[0];
      const tokenInfo = hyperliquid.spotMetaCache.tokens.find(t => t.index === baseTokenIndex);
      console.log(`  Token info:`, JSON.stringify(tokenInfo, null, 2));
      console.log();
    } catch (error) {
      console.log(`${token}: Error - ${error.message}\n`);
    }
  }
}

checkMinOrderSize();
