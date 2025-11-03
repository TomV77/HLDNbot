import dotenv from 'dotenv';
dotenv.config();

async function checkMids() {
  const response = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' })
  });

  const data = await response.json();
  
  console.log('UXPL (@ 210) mid:', data['@210']);
  console.log('UBTC (@142) mid:', data['@142']);
  console.log('UPUMP (@188) mid:', data['@188']);
}

checkMids();
