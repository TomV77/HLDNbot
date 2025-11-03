import HyperliquidConnector from '../hyperliquid.js';
import { getPerpSpotSpreads } from '../utils/arbitrage.js';
import { get24HourVolumes } from '../utils/volume.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

async function test() {
  console.log('Initializing Hyperliquid connector...');
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  await hyperliquid.connect();
  console.log('Connected\n');

  // Test with just BTC
  const testSymbols = ['BTC'];

  console.log('Testing PERP-SPOT spreads...');
  const spreads = await getPerpSpotSpreads(hyperliquid, testSymbols, { config, verbose: true });
  console.log('\nSpread results:', JSON.stringify(spreads, null, 2));

  console.log('\n\nTesting 24H volumes...');
  const volumes = await get24HourVolumes(hyperliquid, testSymbols, { config, verbose: true });
  console.log('\nVolume results:', JSON.stringify(volumes, null, 2));

  hyperliquid.disconnect();
  process.exit(0);
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
