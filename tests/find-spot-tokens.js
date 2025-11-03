import HyperliquidConnector from '../hyperliquid.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Find spot token names by searching for variations
 */

const SEARCH_TERMS = ['BTC', 'ETH', 'PUMP', 'XPL', 'ENA', 'CRV', 'UBTC', 'UETH'];

async function findSpotTokens() {
  const hyperliquid = new HyperliquidConnector({ testnet: false });

  try {
    console.log('Loading spot metadata...\n');
    const spotMeta = await hyperliquid.getSpotMeta();

    console.log('Searching for tokens...');
    console.log('='.repeat(80));

    // Search in tokens
    for (const term of SEARCH_TERMS) {
      const matchingTokens = spotMeta.tokens.filter(t =>
        t.name && t.name.toUpperCase().includes(term.toUpperCase())
      );

      if (matchingTokens.length > 0) {
        matchingTokens.forEach(token => {
          console.log(`\n✅ Found: ${token.name}`);
          console.log(`   Index: ${token.index}`);
          console.log(`   szDecimals: ${token.szDecimals}`);
          console.log(`   Token ID: ${token.tokenId}`);

          // Find spot pair
          const pairIndex = spotMeta.universe.findIndex(pair =>
            pair.tokens[0] === token.index && pair.tokens[1] === 0
          );

          if (pairIndex !== -1) {
            console.log(`   Spot Pair: ${spotMeta.universe[pairIndex].name}`);
            console.log(`   Asset ID: ${10000 + pairIndex}`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\nAll tokens containing these terms:');
    console.log('-'.repeat(80));

    for (const term of SEARCH_TERMS) {
      const matches = spotMeta.tokens.filter(t =>
        t.name && t.name.toUpperCase().includes(term.toUpperCase())
      ).map(t => t.name);

      if (matches.length > 0) {
        console.log(`${term}: ${matches.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  }

  process.exit(0);
}

findSpotTokens();
