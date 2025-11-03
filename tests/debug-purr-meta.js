import HyperliquidConnector from '../hyperliquid.js';
import dotenv from 'dotenv';
dotenv.config();

async function debugPurrMeta() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  const assetId = await hyperliquid.getAssetId('PURR', true);
  const purrIndex = assetId - 10000;
  const pair = hyperliquid.spotMetaCache.universe[purrIndex];

  console.log('PURR Pair Info:');
  console.log(JSON.stringify(pair, null, 2));

  const baseTokenIndex = pair.tokens[0];
  const token = hyperliquid.spotMetaCache.tokens.find(t => t.index === baseTokenIndex);

  console.log('\nPURR Token Info:');
  console.log(JSON.stringify(token, null, 2));
}

debugPurrMeta();
