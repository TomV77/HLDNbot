# Utils - Hyperliquid Trading Utilities

Reusable utility modules for Hyperliquid trading operations.

## Modules

### `symbols.js` - Symbol Mapping

Convert between PERP and SPOT symbol naming conventions.

#### Functions

```javascript
import {
  perpToSpot,
  spotToPerp,
  getSymbolForMarket,
  hasDifferentSymbols,
  getAllPerpSymbols,
  getAllSpotSymbols,
  formatSymbolPair
} from './utils/symbols.js';

// Convert PERP → SPOT
perpToSpot('BTC')        // → 'UBTC'
perpToSpot('ETH')        // → 'UETH'
perpToSpot('PURR')       // → 'PURR' (same on both)

// Convert SPOT → PERP
spotToPerp('UBTC')       // → 'BTC'
spotToPerp('UETH')       // → 'ETH'
spotToPerp('PURR')       // → 'PURR' (same on both)

// Get symbol for specific market
getSymbolForMarket('ETH', true)   // → 'UETH' (spot)
getSymbolForMarket('ETH', false)  // → 'ETH' (perp)

// Check if symbols differ
hasDifferentSymbols('BTC')   // → true (BTC vs UBTC)
hasDifferentSymbols('PURR')  // → false (same on both)

// Get all supported symbols
getAllPerpSymbols()  // → ['BTC', 'ETH', 'SOL', ...]
getAllSpotSymbols()  // → ['UBTC', 'UETH', 'USOL', ...]

// Format for display
formatSymbolPair('BTC')   // → 'BTC (PERP) / UBTC (SPOT)'
formatSymbolPair('PURR')  // → 'PURR (same on both markets)'
```

#### Supported Mappings

| PERP Symbol | SPOT Symbol | Notes |
|-------------|-------------|-------|
| BTC | UBTC | Different symbols |
| ETH | UETH | Different symbols |
| SOL | USOL | Different symbols + lot sizes |
| XPL | UXPL | Different symbols + lot sizes |
| PUMP | UPUMP | Different symbols |
| FARTCOIN | UFART | Different symbols |
| PURR | PURR | **Same on both markets** |
| TRUMP | TRUMP | Same symbol, different lot sizes |

### `volume.js` - Volume Checking

Fetch and analyze 24-hour trading volumes.

#### Functions

```javascript
import {
  get24HourVolumes,
  filterByVolume,
  getHighVolumeSymbols,
  calculateTotalVolumes,
  formatVolumeTable,
  toCSV
} from './utils/volume.js';

// Fetch volumes for multiple pairs (with parallel fetching)
const volumes = await get24HourVolumes(hyperliquid, ['BTC', 'ETH', 'SOL'], {
  concurrency: 3,   // Fetch 3 pairs at once
  verbose: true     // Log progress
});

// Filter by minimum volume
const highVol = filterByVolume(volumes, 100000000, 'perp');  // >100M perp
const highVolSpot = filterByVolume(volumes, 10000000, 'spot'); // >10M spot
const highVolBoth = filterByVolume(volumes, 50000000, 'both'); // >50M both markets
const highVolEither = filterByVolume(volumes, 50000000, 'either'); // >50M either market

// Get high volume symbols directly
const highVolSymbols = await getHighVolumeSymbols(
  hyperliquid,
  ['BTC', 'ETH', 'SOL', 'PUMP'],
  100000000,  // 100M minimum
  { market: 'perp', concurrency: 3, verbose: false }
);

// Calculate totals
const totals = calculateTotalVolumes(volumes);
console.log(totals);
// {
//   totalPerpVolume: 15999044816.6826,
//   totalSpotVolume: 2369166010.4632,
//   perpCount: 7,
//   spotCount: 7
// }

// Format as table
console.log(formatVolumeTable(volumes));

// Export to CSV
const csvContent = toCSV(volumes);
fs.writeFileSync('volumes.csv', csvContent);
```

#### Volume Result Format

```javascript
{
  perpSymbol: 'BTC',
  spotSymbol: 'UBTC',
  perpVolume: 28436.737,     // or 'N/A' if fetch failed
  spotVolume: 904.6164       // or 'N/A' if fetch failed
}
```

#### Rate Limiting

The `get24HourVolumes()` function implements smart rate limiting:
- Fetches PERP and SPOT volumes in parallel for each pair
- Processes multiple pairs concurrently (default: 3)
- Adds 200ms delay between batches
- Maximum ~6 concurrent API calls at any time

## Usage Examples

### Example 1: Check volumes and filter high-volume pairs

```javascript
import HyperliquidConnector from '../hyperliquid.js';
import { get24HourVolumes, filterByVolume } from '../utils/volume.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const hyperliquid = new HyperliquidConnector({ testnet: false });

await hyperliquid.getMeta();
await hyperliquid.getSpotMeta();

// Fetch all volumes
const volumes = await get24HourVolumes(hyperliquid, config.trading.pairs);

// Filter for high-volume pairs (>100M)
const highVolume = filterByVolume(volumes, 100000000, 'perp');

console.log(`High volume pairs: ${highVolume.length}`);
for (const pair of highVolume) {
  console.log(`${pair.perpSymbol}: ${pair.perpVolume.toFixed(0)}`);
}
```

### Example 2: Symbol conversion

```javascript
import { perpToSpot, spotToPerp, formatSymbolPair } from '../utils/symbols.js';

const perpSymbol = 'ETH';
const spotSymbol = perpToSpot(perpSymbol);  // 'UETH'

console.log(`Trading ${formatSymbolPair(perpSymbol)}`);
// Output: "Trading ETH (PERP) / UETH (SPOT)"

// Use in trading code
const assetId = await hyperliquid.getAssetId(spotSymbol, true);
```

### Example 3: Combined usage

```javascript
import HyperliquidConnector from '../hyperliquid.js';
import { getHighVolumeSymbols } from '../utils/volume.js';
import { perpToSpot } from '../utils/symbols.js';

const hyperliquid = new HyperliquidConnector({ testnet: false });
await hyperliquid.getMeta();
await hyperliquid.getSpotMeta();

// Get all pairs with >50M volume
const tradablePairs = await getHighVolumeSymbols(
  hyperliquid,
  ['BTC', 'ETH', 'SOL', 'XPL', 'PUMP'],
  50000000,
  { market: 'perp' }
);

// Trade each high-volume pair
for (const pair of tradablePairs) {
  const spotSymbol = perpToSpot(pair.perpSymbol);
  console.log(`Trading ${pair.perpSymbol}/${spotSymbol} (vol: ${pair.perpVolume})`);

  // Your trading logic here...
}
```

### `spread.js` - Bid-Ask Spread Checking

Fetch and analyze bid-ask spreads for liquidity assessment.

#### Functions

```javascript
import {
  getBidAskSpreads,
  filterBySpread,
  formatSpreadTable,
  spreadToCSV
} from './utils/spread.js';

// Fetch spreads for all pairs (uses config rate limits)
const spreads = await getBidAskSpreads(hyperliquid, config.trading.pairs, {
  verbose: true,
  config: config
});

// Filter by maximum spread
const { wideSpread, narrowSpread } = filterBySpread(spreads, 0.15); // 0.15%

// Format as table
console.log(formatSpreadTable(spreads));

// Export to CSV
const csvContent = spreadToCSV(spreads);
fs.writeFileSync('spreads.csv', csvContent);
```

#### Spread Result Format

```javascript
{
  symbol: 'BTC',
  isSpot: false,
  bid: 107550.0,
  ask: 107560.0,
  mid: 107555.0,
  spread: 10.0,              // Absolute spread (ask - bid)
  spreadPercent: 0.0093,     // Spread percentage ((ask-bid)/mid * 100)
  bidSize: 20.778,
  askSize: 3.295,
  error: null                // Error message if fetch failed
}
```

#### Spread Thresholds

Recommended maximum spreads for delta-neutral trading:
- **0.15%**: Maximum acceptable spread
- **0.05%**: Excellent liquidity
- **> 0.15%**: May cause significant slippage

## Testing

Test scripts are available in the `tests/` directory:

```bash
# Test symbol mapping utilities
node tests/test-symbol-utils.js

# Check 24-hour volumes for all configured pairs
node tests/check-24h-volumes.js

# Check bid-ask spreads for all configured pairs
node tests/check-spreads.js
```

## Performance

- **Symbol conversion**: Instant (static map lookup)
- **Volume fetching**: ~3-4 seconds for 7 pairs with parallel fetching
  - Sequential: ~5 seconds
  - Parallel (concurrency=3): ~3.7 seconds
  - 26% faster with parallel execution

## Notes

- Always call `getMeta()` and `getSpotMeta()` before using volume functions
- Rate limiting is handled automatically in volume utilities
- Symbol mappings are static and don't require API calls
- Volume data is rolling 24-hour window (updated in real-time)
