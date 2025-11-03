import dotenv from 'dotenv';
import { loadConfig } from '../utils/config.js';

dotenv.config();

async function getPositions() {
  const config = loadConfig();
  const wallet = process.env.HL_WALLET;

  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'clearinghouseState',
      user: wallet
    })
  });

  const data = await response.json();

  console.log('Full clearinghouse state:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n=== Asset Positions ===');
  if (data.assetPositions) {
    for (const ap of data.assetPositions) {
      console.log(`${ap.position.coin}: ${ap.position.szi} (entry: ${ap.position.entryPx})`);
    }
  }
}

getPositions();
