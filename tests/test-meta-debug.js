import HyperliquidConnector from '../hyperliquid.js';

async function test() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });
  await hyperliquid.connect();

  const meta = await hyperliquid.getMeta();

  console.log('Looking for HYPE in meta.universe...\n');

  // Find HYPE
  for (let i = 0; i < meta.universe.length; i++) {
    if (meta.universe[i].name && meta.universe[i].name.includes('HYPE')) {
      console.log(`Found at index ${i}:`, meta.universe[i]);
    }
  }

  console.log('\nChecking index 159 (from PERP position):');
  console.log(meta.universe[159]);

  hyperliquid.disconnect();
}

test().catch(console.error);
