# Hyperliquid Spot Market Order Tests

This directory contains individual test scripts for spot market orders on Hyperliquid.

## Available Spot Tokens

The following tokens from your original list are available on Hyperliquid Spot (with their actual names):

| Original | Spot Name | Asset ID | szDecimals | Test Script |
|----------|-----------|----------|------------|-------------|
| BTC      | **UBTC**  | 10140    | 5          | `test-spot-ubtc.js` |
| ETH      | **UETH**  | 10147    | 4          | `test-spot-ueth.js` |
| PUMP     | **PUMP**  | 10020    | 0          | `test-spot-pump.js` |
| XPL      | **UXPL**  | 10199    | 1          | `test-spot-uxpl.js` |
| ENA      | **UENA**  | 10195    | 1          | `test-spot-uena.js` |
| CRV      | ❌ Not Available | - | - | - |

## Running Tests

Each test script is independent and can be run separately:

```bash
# Test Bitcoin (UBTC)
node tests/test-spot-ubtc.js

# Test Ethereum (UETH)
node tests/test-spot-ueth.js

# Test PUMP
node tests/test-spot-pump.js

# Test XPL (UXPL)
node tests/test-spot-uxpl.js

# Test ENA (UENA)
node tests/test-spot-uena.js
```

## What Each Test Does

1. ✅ Verifies the token is available on spot
2. ✅ Connects to Hyperliquid WebSocket
3. ✅ Subscribes to the token's orderbook
4. ✅ **Buys** $11 worth of the token using a market order (IOC)
5. ⏳ Waits for settlement
6. ✅ **Sells** the entire position to close
7. ✅ Verifies position is back to 0 (except possible dust)

## Trade Size

- All tests use **$11 USD** per trade (buffer for fees/slippage)
- This is set by `ORDER_SIZE_USD` constant in each script
- Can be adjusted as needed

## Error Handling

- Each test runs independently
- If one fails, others are not affected
- Errors are logged with full stack traces
- WebSocket connections are properly cleaned up

## Utility Scripts

- `find-spot-tokens.js` - Searches for token names in spot metadata
- `check-spot-availability.js` - Checks which tokens are available
- `debug-spot-meta.js` - Displays full spot metadata structure

## Requirements

- Valid `HL_WALLET` and `HL_PRIVATE_KEY` in `.env` file
- Sufficient USDC balance in spot account
- Network connection to Hyperliquid mainnet

## Notes

- **Important**: Token names on spot differ from perp (UBTC vs BTC, UETH vs ETH, etc.)
- All market orders use IOC (Immediate or Cancel) with 2% slippage
- Tick sizes and lot sizes are automatically retrieved from metadata
- Spot metadata uses different structure than perp metadata
