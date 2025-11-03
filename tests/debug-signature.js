import dotenv from 'dotenv';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

dotenv.config();

console.log('Debug Signature Test');
console.log('====================\n');

// Check credentials
console.log('SOL_WALLET:', process.env.SOL_WALLET);
console.log('API_PUBLIC:', process.env.API_PUBLIC);
console.log('API_PRIVATE length:', process.env.API_PRIVATE?.length);

// Decode private key
try {
  const privateKeyBytes = bs58.decode(process.env.API_PRIVATE);
  console.log('\nPrivate key decoded length:', privateKeyBytes.length, 'bytes');
  console.log('Expected length: 64 bytes (Ed25519 keypair)');

  // Try to extract public key from the private key
  if (privateKeyBytes.length === 64) {
    const publicKey = privateKeyBytes.slice(32, 64);
    const publicKeyBase58 = bs58.encode(publicKey);
    console.log('\nPublic key extracted from private key:', publicKeyBase58);
    console.log('API_PUBLIC from .env:', process.env.API_PUBLIC);
    console.log('Keys match:', publicKeyBase58 === process.env.API_PUBLIC);
  }

  // Test signing
  const testMessage = {
    type: 'create_order',
    account: process.env.SOL_WALLET,
    timestamp: 1234567890000,
    symbol: 'SOL',
    price: '100.00',
    amount: '0.01'
  };

  // Canonicalize
  const canonicalizeJSON = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => canonicalizeJSON(item)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(key => {
      const value = obj[key];
      const valueStr = canonicalizeJSON(value);
      return `"${key}":${valueStr}`;
    });
    return '{' + pairs.join(',') + '}';
  };

  const canonical = canonicalizeJSON(testMessage);
  console.log('\nCanonical message:', canonical);

  const messageBytes = new TextEncoder().encode(canonical);
  console.log('Message bytes length:', messageBytes.length);

  const signature = nacl.sign.detached(messageBytes, privateKeyBytes);
  console.log('\nSignature length:', signature.length, 'bytes (expected 64)');
  console.log('Signature (base58):', bs58.encode(signature));

} catch (error) {
  console.error('\nError:', error.message);
  console.error(error);
}
