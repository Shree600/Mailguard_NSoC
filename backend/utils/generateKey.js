const crypto = require('crypto');

// Generates a 32-byte (256-bit) cryptographically strong random sequence
// and returns it as a 64-character hex string.
const key = crypto.randomBytes(32).toString('hex');

console.log('✨ Secure ENCRYPTION_KEY successfully generated:\n');
console.log(key);
console.log('\nCopy this value and set it in your environment variables:');
console.log(`ENCRYPTION_KEY=${key}\n`);
