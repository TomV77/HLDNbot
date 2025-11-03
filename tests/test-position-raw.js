import HyperliquidConnector from '../hyperliquid.js';

async function test() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });
  await hyperliquid.connect();

  const response = await fetch(hyperliquid.restUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'clearinghouseState',
      user: hyperliquid.wallet
    })
  });

  const data = await response.json();

  console.log('Raw position data:');
  console.log(JSON.stringify(data.assetPositions[0], null, 2));

  const assetIndex = data.assetPositions[0].position.coin;
  console.log('\nasset.coin value:', assetIndex);
  console.log('typeof:', typeof assetIndex);

  const meta = await hyperliquid.getMeta();
  console.log('\nmeta.universe[assetIndex]:', meta.universe[assetIndex]);

  hyperliquid.disconnect();
}

test().catch(console.error);
