import HyperliquidConnector from '../hyperliquid.js';
import dotenv from 'dotenv';
dotenv.config();

async function debugSpotMeta() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  // This will cache the spotMeta
  const assetId = await hyperliquid.getAssetId('UBTC', true);
  
  const ubtcIndex = assetId - 10000;
  const pair = hyperliquid.spotMetaCache.universe[ubtcIndex];

  console.log('UBTC Pair Info:');
  console.log(JSON.stringify(pair, null, 2));

  const baseTokenIndex = pair.tokens[0];
  const token = hyperliquid.spotMetaCache.tokens.find(t => t.index === baseTokenIndex);

  console.log('\nUBTC Token Info:');
  console.log(JSON.stringify(token, null, 2));
}

debugSpotMeta();
