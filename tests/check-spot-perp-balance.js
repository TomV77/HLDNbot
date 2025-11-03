import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

/**
 * Check if Spot and Perp balances are balanced
 * Shows warning if imbalanced
 */

const HL_WALLET = process.env.HL_WALLET;
const API_URL = 'https://api.hyperliquid.xyz/info';

// Threshold for balance warning (percentage)
const BALANCE_THRESHOLD_PERCENT = 10; // Warn if difference > 10%

async function getSpotBalance(user) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'spotClearinghouseState',
      user: user
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function getPerpBalance(user) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'clearinghouseState',
      user: user
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function checkBalanceImbalance() {
  console.log('='.repeat(80));
  console.log('Hyperliquid Spot/Perp Balance Check');
  console.log('='.repeat(80));
  console.log();

  if (!HL_WALLET) {
    throw new Error('Missing HL_WALLET in .env file');
  }

  console.log(`Wallet: ${HL_WALLET}`);
  console.log();

  try {
    // Get both balances in parallel
    const [perpData, spotData] = await Promise.all([
      getPerpBalance(HL_WALLET),
      getSpotBalance(HL_WALLET)
    ]);

    // Extract perp balance
    let perpBalance = 0;
    if (perpData.marginSummary) {
      perpBalance = parseFloat(perpData.marginSummary.accountValue || 0);
    } else if (perpData.crossMarginSummary) {
      perpBalance = parseFloat(perpData.crossMarginSummary.accountValue || 0);
    }

    // Extract spot balance (USDC only)
    let spotBalance = 0;
    if (spotData.balances && spotData.balances.length > 0) {
      const usdcBalance = spotData.balances.find(
        b => b.coin === 'USDC' || b.token === '0x' + '0'.repeat(31) + '0'
      );
      if (usdcBalance) {
        spotBalance = parseFloat(usdcBalance.total || usdcBalance.hold || 0);
      }
    }

    // Display balances
    console.log('┌─────────────────────────────────────────┐');
    console.log('│              BALANCES                   │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│  Perp Account:    $${perpBalance.toFixed(2).padStart(12)}      │`);
    console.log(`│  Spot Account:    $${spotBalance.toFixed(2).padStart(12)}      │`);
    console.log('├─────────────────────────────────────────┤');
    console.log(`│  Total:           $${(perpBalance + spotBalance).toFixed(2).padStart(12)}      │`);
    console.log('└─────────────────────────────────────────┘');
    console.log();

    // Calculate difference
    const totalBalance = perpBalance + spotBalance;
    const targetBalance = totalBalance / 2; // Should be 50/50
    const perpDiff = perpBalance - targetBalance;
    const spotDiff = spotBalance - targetBalance;
    const diffPercent = totalBalance > 0 ? (Math.abs(perpDiff) / totalBalance) * 100 : 0;

    // Check if balanced
    const isBalanced = diffPercent <= BALANCE_THRESHOLD_PERCENT;

    if (isBalanced) {
      console.log('✅ BALANCED');
      console.log(`   Accounts are balanced within ${BALANCE_THRESHOLD_PERCENT}% threshold`);
      console.log(`   Difference: $${Math.abs(perpDiff).toFixed(2)} (${diffPercent.toFixed(2)}%)`);
    } else {
      console.log('⚠️  WARNING: IMBALANCE DETECTED!');
      console.log('─'.repeat(80));
      console.log(`   Difference: $${Math.abs(perpDiff).toFixed(2)} (${diffPercent.toFixed(2)}%)`);
      console.log(`   Threshold: ${BALANCE_THRESHOLD_PERCENT}%`);
    }

    // Always show transfer suggestion to achieve perfect balance
    console.log();
    if (Math.abs(perpDiff) > 0.01) {
      console.log('💡 To achieve perfect 50/50 balance:');
      if (perpBalance > spotBalance) {
        console.log(`   Transfer $${Math.abs(perpDiff).toFixed(2)} from Perp → Spot`);
        console.log(`   Result: Perp: $${targetBalance.toFixed(2)} | Spot: $${targetBalance.toFixed(2)}`);
      } else if (spotBalance > perpBalance) {
        console.log(`   Transfer $${Math.abs(spotDiff).toFixed(2)} from Spot → Perp`);
        console.log(`   Result: Perp: $${targetBalance.toFixed(2)} | Spot: $${targetBalance.toFixed(2)}`);
      }

      if (!isBalanced) {
        console.log();
        console.log('   ⚠️  Note: Manual transfer required (wallet/key mismatch)');
        console.log('          Use Hyperliquid UI or verify credentials in .env');
      }
    } else {
      console.log('💡 Accounts are perfectly balanced!');
    }

    console.log();
    console.log('='.repeat(80));

    // Return the imbalance status
    return {
      isBalanced,
      perpBalance,
      spotBalance,
      totalBalance,
      diffPercent,
      diffAmount: Math.abs(perpDiff)
    };

  } catch (error) {
    console.error('❌ Error fetching balances:', error.message);
    throw error;
  }
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  checkBalanceImbalance()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
export { checkBalanceImbalance };
