import dotenv from 'dotenv';
dotenv.config();

async function checkHLPosition() {
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'clearinghouseState',
      user: process.env.HL_WALLET
    })
  });

  const state = await response.json();

  console.log('Hyperliquid Positions:');
  console.log('='.repeat(80));

  if (state.assetPositions && state.assetPositions.length > 0) {
    for (const pos of state.assetPositions) {
      const coin = pos.position.coin;
      const szi = parseFloat(pos.position.szi);
      const entryPx = parseFloat(pos.position.entryPx);
      const notional = Math.abs(szi * entryPx);
      const side = szi > 0 ? 'LONG' : 'SHORT';

      console.log(`${coin}: ${side} ${Math.abs(szi)} @ $${entryPx} (notional: $${notional.toFixed(2)})`);
    }
  } else {
    console.log('No positions');
  }

  console.log('='.repeat(80));
}

checkHLPosition().catch(console.error);
