import {
  perpToSpot,
  spotToPerp,
  getSymbolForMarket,
  hasDifferentSymbols,
  getAllPerpSymbols,
  getAllSpotSymbols,
  formatSymbolPair
} from '../utils/symbols.js';

/**
 * Test symbol mapping utilities
 */

console.log('='.repeat(80));
console.log('Symbol Mapping Utilities Test');
console.log('='.repeat(80));
console.log();

// Test 1: PERP to SPOT conversion
console.log('[Test 1] PERP → SPOT Conversion');
console.log('─'.repeat(80));
const perpSymbols = ['BTC', 'ETH', 'SOL', 'XPL', 'PUMP', 'FARTCOIN', 'PURR', 'TRUMP'];
for (const perp of perpSymbols) {
  const spot = perpToSpot(perp);
  const different = perp !== spot ? '✓ Different' : '○ Same';
  console.log(`  ${perp.padEnd(10)} → ${spot.padEnd(10)} ${different}`);
}
console.log();

// Test 2: SPOT to PERP conversion
console.log('[Test 2] SPOT → PERP Conversion');
console.log('─'.repeat(80));
const spotSymbols = ['UBTC', 'UETH', 'USOL', 'UXPL', 'UPUMP', 'UFART', 'PURR', 'TRUMP'];
for (const spot of spotSymbols) {
  const perp = spotToPerp(spot);
  console.log(`  ${spot.padEnd(10)} → ${perp.padEnd(10)}`);
}
console.log();

// Test 3: Get symbol for specific market
console.log('[Test 3] Get Symbol for Market');
console.log('─'.repeat(80));
const testSymbol = 'ETH';
console.log(`  Input: '${testSymbol}'`);
console.log(`  For SPOT market: '${getSymbolForMarket(testSymbol, true)}'`);
console.log(`  For PERP market: '${getSymbolForMarket(testSymbol, false)}'`);
console.log();

// Test 4: Check which symbols are different
console.log('[Test 4] Symbols with Different Names');
console.log('─'.repeat(80));
const allPerps = getAllPerpSymbols();
for (const perp of allPerps) {
  if (hasDifferentSymbols(perp)) {
    console.log(`  ${formatSymbolPair(perp)}`);
  }
}
console.log();

// Test 5: Symbols with same names
console.log('[Test 5] Symbols with Same Names');
console.log('─'.repeat(80));
for (const perp of allPerps) {
  if (!hasDifferentSymbols(perp)) {
    console.log(`  ${formatSymbolPair(perp)}`);
  }
}
console.log();

// Test 6: Get all supported symbols
console.log('[Test 6] All Supported Symbols');
console.log('─'.repeat(80));
console.log(`  PERP Symbols (${allPerps.length}): ${allPerps.join(', ')}`);
console.log(`  SPOT Symbols (${getAllSpotSymbols().length}): ${getAllSpotSymbols().join(', ')}`);
console.log();

// Test 7: Round-trip conversion test
console.log('[Test 7] Round-trip Conversion Test');
console.log('─'.repeat(80));
let passed = 0;
let failed = 0;
for (const perp of allPerps) {
  const spot = perpToSpot(perp);
  const backToPerp = spotToPerp(spot);
  if (perp === backToPerp) {
    console.log(`  ✅ ${perp} → ${spot} → ${backToPerp}`);
    passed++;
  } else {
    console.log(`  ❌ ${perp} → ${spot} → ${backToPerp} (FAILED)`);
    failed++;
  }
}
console.log();
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log();

console.log('='.repeat(80));
console.log('✅ Symbol mapping utilities test completed');
console.log('='.repeat(80));
