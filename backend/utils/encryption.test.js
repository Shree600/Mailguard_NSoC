const assert = require('assert');
const crypto = require('crypto');

// Save original env
const originalEnv = process.env.NODE_ENV;
const originalKey = process.env.ENCRYPTION_KEY;

let passed = 0;
let failed = 0;

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error);
    failed++;
  }
}

// Ensure clean state before tests
function resetEnv() {
  delete process.env.NODE_ENV;
  delete process.env.ENCRYPTION_KEY;
  // Clear require cache for encryption.js so it runs module-level validation again
  delete require.cache[require.resolve('./encryption.js')];
}

console.log('Running Encryption Tests...\n');

// 1. App crashes when ENCRYPTION_KEY missing in production
runTest('Crashes in production when ENCRYPTION_KEY is missing', () => {
  resetEnv();
  process.env.NODE_ENV = 'production';
  assert.throws(
    () => require('./encryption.js'),
    /ENCRYPTION_KEY is required unless NODE_ENV is development/
  );
});

// 2. App works in development without key
runTest('Works in development without key (fallback)', () => {
  resetEnv();
  process.env.NODE_ENV = 'development';
  const encryption = require('./encryption.js');
  
  const text = 'secret123';
  const encrypted = encryption.encrypt(text);
  assert.ok(encrypted.includes('v1:'));
  const decrypted = encryption.decrypt(encrypted);
  assert.strictEqual(decrypted, text);
});

// 3. Missing key fails outside development
runTest('Crashes outside development when ENCRYPTION_KEY is missing', () => {
  resetEnv();
  assert.throws(
    () => require('./encryption.js'),
    /ENCRYPTION_KEY is required unless NODE_ENV is development/
  );

  resetEnv();
  process.env.NODE_ENV = 'staging';
  assert.throws(
    () => require('./encryption.js'),
    /ENCRYPTION_KEY is required unless NODE_ENV is development/
  );
});

// 4. Invalid key format throws error
runTest('Invalid key format throws error', () => {
  resetEnv();
  process.env.ENCRYPTION_KEY = 'invalid-short-key';
  assert.throws(
    () => require('./encryption.js'),
    /Invalid ENCRYPTION_KEY format/
  );

  resetEnv();
  // Valid length but not valid hex
  process.env.ENCRYPTION_KEY = 'z'.repeat(64);
  assert.throws(
    () => require('./encryption.js'),
    /Invalid ENCRYPTION_KEY format/
  );
});

// 5. Valid key works correctly
runTest('Valid 64-char hex key works correctly', () => {
  resetEnv();
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  const encryption = require('./encryption.js');
  
  const text = 'another_secret';
  const encrypted = encryption.encrypt(text);
  assert.strictEqual(encryption.decrypt(encrypted), text);
});

// 6. Idempotent helpers avoid double encryption
runTest('encryptIfNeeded encrypts plaintext only once', () => {
  resetEnv();
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  const encryption = require('./encryption.js');

  const encrypted = encryption.encryptIfNeeded('refresh-token');
  assert.ok(encryption.isEncrypted(encrypted));
  assert.strictEqual(encryption.encryptIfNeeded(encrypted), encrypted);
  assert.strictEqual(encryption.decryptIfNeeded(encrypted), 'refresh-token');
  assert.strictEqual(encryption.decryptIfNeeded('plain-token'), 'plain-token');
});

// 7. Invalid inputs handling
runTest('Throws on invalid inputs for encrypt and decrypt', () => {
  resetEnv();
  process.env.NODE_ENV = 'development';
  const encryption = require('./encryption.js');
  
  assert.throws(() => encryption.encrypt(null), /Invalid input/);
  assert.throws(() => encryption.encrypt({}), /Invalid input/);
  assert.throws(() => encryption.decrypt(null), /Invalid input/);
  assert.throws(() => encryption.decrypt('invalid:format'), /Invalid encrypted data format/);
});

// 8. Backwards compatibility (legacy unversioned format)
runTest('Decrypts legacy unversioned data format', () => {
  resetEnv();
  const testKey = '0'.repeat(64);
  process.env.ENCRYPTION_KEY = testKey;
  
  // Create old format manually
  const keyBuf = Buffer.from(testKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  
  const text = 'legacy_data';
  let encryptedData = cipher.update(text, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  const legacyFormat = `${iv.toString('hex')}:${authTag.toString('hex')}:${encryptedData}`;
  
  const encryption = require('./encryption.js');
  const decrypted = encryption.decrypt(legacyFormat);
  assert.strictEqual(decrypted, text);
});

console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);

// Restore environment
if (originalEnv === undefined) {
  delete process.env.NODE_ENV;
} else {
  process.env.NODE_ENV = originalEnv;
}

if (originalKey === undefined) {
  delete process.env.ENCRYPTION_KEY;
} else {
  process.env.ENCRYPTION_KEY = originalKey;
}

if (failed > 0) {
  process.exit(1);
}
