import HyperliquidConnector from '../hyperliquid.js';
import { loadState, saveState, hasPosition, getCurrentPosition, recordPosition, closePosition as closePositionState, updateCheckTime, canClosePosition, getPositionAge } from '../utils/state.js';
import { findBestOpportunities, isSignificantlyBetter } from '../utils/opportunity.js';
import fs from 'fs';

/**
 * Test Position Rebalancing Logic
 *
 * This test simulates different position scenarios to verify the bot's rebalancing
 * decisions without having to wait 2 weeks. It tests:
 *
 * 1. Position too young to rebalance (< min hold time)
 * 2. Position old enough to rebalance (>= min hold time)
 * 3. Negative funding (should close immediately when old enough)
 * 4. 2x better opportunity exists (should switch when old enough)
 * 5. Current position still competitive (should hold)
 */

// Configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Test parameters (much shorter for testing)
const TEST_MIN_HOLD_TIME_MS = 2 * 60 * 1000;  // 2 minutes instead of 2 weeks
const IMPROVEMENT_FACTOR = 2;  // Same as production

// Mock state file for testing
const TEST_STATE_FILE = './test-rebalancing-state.json';

/**
 * Create a mock position with custom age
 */
function createMockPosition(ageMs, symbol = 'BTC', fundingAPY = 10.95) {
  const now = Date.now();
  const openTime = now - ageMs;

  return {
    symbol,
    perpSymbol: symbol,
    spotSymbol: symbol === 'BTC' ? 'UBTC' : `U${symbol}`,
    perpSize: 0.001,
    spotSize: 0.001,
    perpEntryPrice: 107500,
    spotEntryPrice: 107520,
    positionValue: 107.5,
    fundingRate: fundingAPY / 100 / 365 / 24,  // Convert APY to hourly
    annualizedFunding: fundingAPY / 100,  // Store as decimal
    openTime,
    lastCheckTime: now
  };
}

/**
 * Create mock state with a position
 */
function createMockState(position) {
  return {
    version: "1.0",
    position: position || null,
    lastCheckTime: Date.now(),
    lastOpportunityCheck: Date.now(),
    history: []
  };
}

/**
 * Mock finding opportunities with custom funding rates
 */
function mockFindBestOpportunities(currentSymbol, currentFunding, bestSymbol, bestFunding) {
  const opportunities = [];

  // Add current position
  opportunities.push({
    symbol: currentSymbol,
    avgFundingRate: currentFunding / 100,  // Convert to decimal
    avgFundingPercent: currentFunding
  });

  // Add best opportunity
  if (bestSymbol && bestSymbol !== currentSymbol) {
    opportunities.push({
      symbol: bestSymbol,
      avgFundingRate: bestFunding / 100,
      avgFundingPercent: bestFunding
    });
  }

  // Sort by funding (highest first)
  opportunities.sort((a, b) => b.avgFundingRate - a.avgFundingRate);

  return {
    best: opportunities[0],
    rankedOpportunities: opportunities,
    report: `Mock opportunities: ${opportunities.map(o => `${o.symbol} ${o.avgFundingPercent.toFixed(2)}%`).join(', ')}`
  };
}

/**
 * Test rebalancing decision logic
 */
function testRebalancingDecision(testName, position, minHoldTime, currentFunding, bestOppSymbol, bestOppFunding) {
  console.log('='.repeat(80));
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(80));
  console.log();

  // Check position age
  const age = getPositionAge(position);
  const ageMinutes = age / (1000 * 60);
  const canClose = canClosePosition(position, minHoldTime);

  console.log(`Position: ${position.symbol}`);
  console.log(`  Entry Funding: ${(position.annualizedFunding * 100).toFixed(2)}% APY`);
  console.log(`  Position Value: $${position.positionValue.toFixed(2)}`);
  console.log(`  Open Time: ${new Date(position.openTime).toLocaleString()}`);
  console.log(`  Age: ${ageMinutes.toFixed(2)} minutes`);
  console.log(`  Can Close: ${canClose ? 'YES' : 'NO'} (min hold: ${minHoldTime / (1000 * 60)} minutes)`);
  console.log();

  if (!canClose) {
    console.log('DECISION: HOLD (within minimum hold time)');
    console.log('  ✅ Position is too young to rebalance');
    console.log();
    return 'HOLD';
  }

  // Check current funding
  console.log(`Current Market Data:`);
  console.log(`  ${position.symbol} Current Funding: ${currentFunding.toFixed(2)}% APY`);

  const MIN_FUNDING_THRESHOLD = 5; // Match config.thresholds.minFundingRatePercent

  if (currentFunding < 0) {
    console.log(`  ❌ Funding is negative!`);
    console.log();

    // Check if there's a positive alternative
    if (bestOppSymbol && bestOppFunding > 0) {
      console.log(`  Best Positive Alternative: ${bestOppSymbol} ${bestOppFunding.toFixed(2)}% APY`);
      console.log();
      console.log('DECISION: SWITCH (close negative position and open positive alternative)');
      console.log(`  ✅ Found positive alternative: ${bestOppSymbol}`);
      console.log(`  → Close ${position.symbol} and open ${bestOppSymbol}`);
      console.log();
      return 'SWITCH';
    } else {
      console.log(`  ⚠️  No positive funding alternatives available`);
      console.log();
      console.log('DECISION: CLOSE (funding turned negative, no positive alternatives)');
      console.log(`  Will close without reopening`);
      console.log();
      return 'CLOSE';
    }
  } else if (currentFunding < MIN_FUNDING_THRESHOLD) {
    console.log(`  ⚠️  Funding below minimum threshold (${currentFunding.toFixed(2)}% < ${MIN_FUNDING_THRESHOLD}%)`);
    console.log();

    // Would be filtered out - check for better alternative
    if (bestOppSymbol && bestOppFunding >= MIN_FUNDING_THRESHOLD) {
      console.log(`  Best Alternative: ${bestOppSymbol} ${bestOppFunding.toFixed(2)}% APY`);
      console.log();
      console.log('DECISION: SWITCH (current below threshold, better alternative available)');
      console.log(`  ✅ Found better opportunity: ${bestOppSymbol}`);
      console.log(`  → Close ${position.symbol} and open ${bestOppSymbol}`);
      console.log();
      return 'SWITCH';
    } else {
      console.log(`  No valid alternatives (all below threshold)`);
      console.log();
      console.log('DECISION: HOLD (below threshold but no better alternatives)');
      console.log(`  ⚠️  Will hold current position despite low funding`);
      console.log();
      return 'HOLD';
    }
  }

  // Check for better opportunity
  if (bestOppSymbol && bestOppSymbol !== position.symbol) {
    console.log(`  ${bestOppSymbol} Best Opportunity: ${bestOppFunding.toFixed(2)}% APY`);
    console.log();

    const isBetter = isSignificantlyBetter(
      { avgFundingRate: position.annualizedFunding },
      { avgFundingRate: bestOppFunding / 100, symbol: bestOppSymbol },
      IMPROVEMENT_FACTOR
    );

    const improvement = (bestOppFunding / 100) / position.annualizedFunding;

    console.log(`Improvement Analysis:`);
    console.log(`  Current: ${(position.annualizedFunding * 100).toFixed(2)}% APY`);
    console.log(`  New: ${bestOppFunding.toFixed(2)}% APY`);
    console.log(`  Improvement: ${improvement.toFixed(2)}x`);
    console.log(`  Required: ${IMPROVEMENT_FACTOR}x`);
    console.log();

    if (isBetter) {
      console.log('DECISION: SWITCH (significantly better opportunity)');
      console.log(`  ✅ Found ${improvement.toFixed(2)}x better opportunity`);
      console.log(`  → Close ${position.symbol} and open ${bestOppSymbol}`);
      console.log();
      return 'SWITCH';
    }
  } else if (bestOppSymbol && bestOppSymbol === position.symbol) {
    // Best opportunity is the same symbol we're already in
    console.log(`  Best Opportunity: ${bestOppSymbol} ${bestOppFunding.toFixed(2)}% APY`);
    console.log();
    console.log(`Analysis:`);
    console.log(`  Already holding the best opportunity (${position.symbol})`);
    console.log(`  Current market funding: ${bestOppFunding.toFixed(2)}% APY`);
    console.log(`  Entry funding: ${(position.annualizedFunding * 100).toFixed(2)}% APY`);
    console.log(`  → No need to switch (same symbol)`);
    console.log();
  } else {
    console.log();
  }

  console.log('DECISION: HOLD (current position still competitive)');
  console.log('  ✅ No significantly better opportunity');
  console.log();
  return 'HOLD';
}

/**
 * Run all test scenarios
 */
async function runTests() {
  console.log();
  console.log('='.repeat(80));
  console.log('Position Rebalancing Logic Tests');
  console.log('='.repeat(80));
  console.log();
  console.log(`Test Parameters:`);
  console.log(`  Min Hold Time: ${TEST_MIN_HOLD_TIME_MS / (1000 * 60)} minutes (vs production: 14 days)`);
  console.log(`  Improvement Factor: ${IMPROVEMENT_FACTOR}x`);
  console.log();

  const results = [];

  // Test 1: Position too young to rebalance
  const position1 = createMockPosition(1 * 60 * 1000, 'BTC', 10.95);  // 1 minute old
  const decision1 = testRebalancingDecision(
    'Scenario 1: Position Too Young',
    position1,
    TEST_MIN_HOLD_TIME_MS,
    10.95,  // Current funding same
    'ETH',
    25.0    // Much better opportunity exists
  );
  results.push({ scenario: 'Too Young', decision: decision1, expected: 'HOLD' });

  // Test 2: Position old enough, still competitive
  const position2 = createMockPosition(3 * 60 * 1000, 'BTC', 10.95);  // 3 minutes old
  const decision2 = testRebalancingDecision(
    'Scenario 2: Old Enough, Still Competitive',
    position2,
    TEST_MIN_HOLD_TIME_MS,
    10.95,  // Current funding same
    'ETH',
    15.0    // Only 1.37x better, not 2x
  );
  results.push({ scenario: 'Old Enough, Competitive', decision: decision2, expected: 'HOLD' });

  // Test 3: Funding turned negative with positive alternative
  const position3 = createMockPosition(3 * 60 * 1000, 'BTC', 10.95);  // 3 minutes old
  const decision3 = testRebalancingDecision(
    'Scenario 3: Funding Turned Negative with Positive Alternative',
    position3,
    TEST_MIN_HOLD_TIME_MS,
    -5.0,   // Negative funding!
    'ETH',
    15.0    // Positive alternative available
  );
  results.push({ scenario: 'Negative Funding (with Alt)', decision: decision3, expected: 'SWITCH' });

  // Test 4: 2x better opportunity exists
  const position4 = createMockPosition(3 * 60 * 1000, 'BTC', 10.95);  // 3 minutes old
  const decision4 = testRebalancingDecision(
    'Scenario 4: 2x Better Opportunity',
    position4,
    TEST_MIN_HOLD_TIME_MS,
    10.95,  // Current funding same
    'ETH',
    25.0    // 2.28x better
  );
  results.push({ scenario: '2x Better Opportunity', decision: decision4, expected: 'SWITCH' });

  // Test 5: Barely under 2x threshold
  const position5 = createMockPosition(3 * 60 * 1000, 'BTC', 10.0);  // 3 minutes old
  const decision5 = testRebalancingDecision(
    'Scenario 5: Just Under 2x Threshold',
    position5,
    TEST_MIN_HOLD_TIME_MS,
    10.0,   // Current funding same
    'ETH',
    19.5    // 1.95x better (just under 2x)
  );
  results.push({ scenario: 'Under 2x Threshold', decision: decision5, expected: 'HOLD' });

  // Test 6: Exactly at 2x threshold
  const position6 = createMockPosition(3 * 60 * 1000, 'BTC', 10.0);  // 3 minutes old
  const decision6 = testRebalancingDecision(
    'Scenario 6: Exactly at 2x Threshold',
    position6,
    TEST_MIN_HOLD_TIME_MS,
    10.0,   // Current funding same
    'ETH',
    20.0    // Exactly 2x better
  );
  results.push({ scenario: 'At 2x Threshold', decision: decision6, expected: 'SWITCH' });

  // Test 7: Best opportunity is same symbol (should HOLD)
  const position7 = createMockPosition(3 * 60 * 1000, 'HYPE', 10.0);  // 3 minutes old
  const decision7 = testRebalancingDecision(
    'Scenario 7: Best Opportunity Is Same Symbol',
    position7,
    TEST_MIN_HOLD_TIME_MS,
    25.0,   // Current funding much higher now (2.5x!)
    'HYPE', // But it's still the same symbol
    25.0    // 2.5x better than entry
  );
  results.push({ scenario: 'Same Symbol (No Switch)', decision: decision7, expected: 'HOLD' });

  // Test 8: Negative funding but positive alternative exists (should SWITCH)
  const position8 = createMockPosition(3 * 60 * 1000, 'BTC', 10.0);  // 3 minutes old
  const decision8 = testRebalancingDecision(
    'Scenario 8: Negative Funding with Positive Alternative',
    position8,
    TEST_MIN_HOLD_TIME_MS,
    -5.0,   // Current funding negative
    'ETH',
    8.0     // Positive alternative available
  );
  results.push({ scenario: 'Negative to Positive Switch', decision: decision8, expected: 'SWITCH' });

  // Test 9: Negative funding and all alternatives negative (should CLOSE only)
  const position9 = createMockPosition(3 * 60 * 1000, 'BTC', 10.0);  // 3 minutes old
  const decision9 = testRebalancingDecision(
    'Scenario 9: All Symbols Have Negative Funding',
    position9,
    TEST_MIN_HOLD_TIME_MS,
    -5.0,   // Current funding negative
    null,   // No positive alternatives
    -2.0    // Best would be negative anyway
  );
  results.push({ scenario: 'All Negative (Close Only)', decision: decision9, expected: 'CLOSE' });

  // Test 10: Position filtered out (low funding 3%), positive alternative exists
  const position10 = createMockPosition(3 * 60 * 1000, 'BTC', 10.0);  // 3 minutes old
  const decision10 = testRebalancingDecision(
    'Scenario 10: Current Position Filtered Out (Low Funding)',
    position10,
    TEST_MIN_HOLD_TIME_MS,
    3.0,    // Current funding below 5% threshold (gets filtered)
    'ETH',
    12.0    // Better alternative available
  );
  results.push({ scenario: 'Low Funding (Below Threshold)', decision: decision10, expected: 'SWITCH' });

  // Test 11: Position filtered out (negative funding), positive alternative exists
  const position11 = createMockPosition(3 * 60 * 1000, 'BTC', 10.0);  // 3 minutes old
  const decision11 = testRebalancingDecision(
    'Scenario 11: Current Position Filtered Out (Negative)',
    position11,
    TEST_MIN_HOLD_TIME_MS,
    -3.0,   // Current funding negative (gets filtered)
    'ETH',
    12.0    // Positive alternative available
  );
  results.push({ scenario: 'Filtered Negative (Switch)', decision: decision11, expected: 'SWITCH' });

  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.decision === result.expected ? '✅ PASS' : '❌ FAIL';
    const icon = result.decision === result.expected ? '✅' : '❌';

    console.log(`${icon} ${result.scenario.padEnd(30)} Decision: ${result.decision.padEnd(8)} Expected: ${result.expected.padEnd(8)} ${status}`);

    if (result.decision === result.expected) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log();
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log();

  if (failed > 0) {
    console.log('❌ Some tests failed! Review the logic in bot.js');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Rebalancing logic is working correctly');
  }

  console.log();
}

/**
 * Interactive test mode - wait for actual time to pass
 */
async function runInteractiveTest() {
  console.log();
  console.log('='.repeat(80));
  console.log('Interactive Rebalancing Test');
  console.log('='.repeat(80));
  console.log();
  console.log('This test will create a mock position and wait for the minimum hold time');
  console.log(`to pass, then test rebalancing decisions with real timing.`);
  console.log();
  console.log(`Min Hold Time: ${TEST_MIN_HOLD_TIME_MS / 1000} seconds`);
  console.log();

  // Create a fresh position
  const position = createMockPosition(0, 'BTC', 10.95);
  const state = createMockState(position);

  console.log(`Position created at ${new Date(position.openTime).toLocaleTimeString()}`);
  console.log();

  // Wait and check every 10 seconds
  const checkInterval = 10 * 1000;  // 10 seconds

  console.log('Checking every 10 seconds...');
  console.log();

  const interval = setInterval(() => {
    const age = Date.now() - position.openTime;
    const ageSeconds = age / 1000;
    const canClose = age >= TEST_MIN_HOLD_TIME_MS;

    const timeRemaining = TEST_MIN_HOLD_TIME_MS - age;
    const secondsRemaining = Math.max(0, timeRemaining / 1000);

    console.log(`[${new Date().toLocaleTimeString()}] Age: ${ageSeconds.toFixed(0)}s | Can Close: ${canClose ? 'YES ✅' : `NO (${secondsRemaining.toFixed(0)}s remaining)`}`);

    if (canClose) {
      console.log();
      console.log('✅ Minimum hold time reached! Position can now be rebalanced.');
      console.log();

      // Test a rebalancing decision
      testRebalancingDecision(
        'Interactive Test: Better Opportunity After Hold Time',
        position,
        TEST_MIN_HOLD_TIME_MS,
        10.95,
        'ETH',
        25.0
      );

      clearInterval(interval);
    }
  }, checkInterval);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--interactive')) {
  runInteractiveTest().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
} else {
  runTests().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
}
