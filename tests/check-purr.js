import HyperliquidConnector from '../hyperliquid.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkPurr() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  // Check PURR
  try {
    const assetId = await hyperliquid.getAssetId('PURR', true);
    const assetInfo = hyperliquid.getAssetInfo('PURR', assetId);
    const orderbookCoin = hyperliquid.getCoinForOrderbook('PURR', assetId);
    
    console.log('PURR:');
    console.log('  Asset ID:', assetId);
    console.log('  szDecimals:', assetInfo.szDecimals);
    console.log('  Orderbook coin:', orderbookCoin);
  } catch (e) {
    console.log('PURR error:', e.message);
  }

  // Check UPURR 
  try {
    const assetId2 = await hyperliquid.getAssetId('UPURR', true);
    const assetInfo2 = hyperliquid.getAssetInfo('UPURR', assetId2);
    const orderbookCoin2 = hyperliquid.getCoinForOrderbook('UPURR', assetId2);
    
    console.log('\nUPURR:');
    console.log('  Asset ID:', assetId2);
    console.log('  szDecimals:', assetInfo2.szDecimals);
    console.log('  Orderbook coin:', orderbookCoin2);
  } catch (e) {
    console.log('\nUPURR error:', e.message);
  }
}

checkPurr();
