const assert = require('assert');
const mongoose = require('mongoose');
const Email = require('../models/Email');

const LIMITS = {
  gmailId: 255,
  body: 100000,
  htmlBody: 500000,
  threadId: 255,
  snippet: 1000,
  labelId: 128,
};

let passed = 0;
let failed = 0;

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error.message);
    failed++;
  }
}

function buildValidEmail(overrides = {}) {
  return new Email({
    userId: new mongoose.Types.ObjectId(),
    gmailId: 'gmail-message-id',
    sender: 'sender@example.com',
    subject: 'Test subject',
    body: 'Safe body',
    htmlBody: '<p>Safe body</p>',
    receivedAt: new Date(),
    metadata: {
      threadId: 'thread-123',
      labelIds: ['INBOX'],
      snippet: 'Short snippet',
      hasAttachments: false,
    },
    ...overrides,
  });
}

function expectFieldError(doc, fieldPath, expectedMessage) {
  const validationError = doc.validateSync();
  assert(validationError, 'Expected validation to fail');
  assert(validationError.errors[fieldPath], `Expected validation error for ${fieldPath}`);
  assert.strictEqual(validationError.errors[fieldPath].message, expectedMessage);
}

console.log('Running Email model max length tests...\n');

runTest('accepts values at configured max lengths', () => {
  const email = buildValidEmail({
    gmailId: 'g'.repeat(LIMITS.gmailId),
    body: 'b'.repeat(LIMITS.body),
    htmlBody: 'h'.repeat(LIMITS.htmlBody),
    metadata: {
      threadId: 't'.repeat(LIMITS.threadId),
      labelIds: ['l'.repeat(LIMITS.labelId)],
      snippet: 's'.repeat(LIMITS.snippet),
      hasAttachments: false,
    },
  });

  const validationError = email.validateSync();
  assert.strictEqual(validationError, undefined, 'Expected document to be valid at max lengths');
});

runTest('rejects body longer than max length', () => {
  const email = buildValidEmail({ body: 'b'.repeat(LIMITS.body + 1) });
  expectFieldError(email, 'body', `Body cannot exceed ${LIMITS.body} characters`);
});

runTest('rejects htmlBody longer than max length', () => {
  const email = buildValidEmail({ htmlBody: 'h'.repeat(LIMITS.htmlBody + 1) });
  expectFieldError(email, 'htmlBody', `HTML body cannot exceed ${LIMITS.htmlBody} characters`);
});

runTest('rejects snippet longer than max length', () => {
  const email = buildValidEmail({
    metadata: {
      threadId: 'thread-123',
      labelIds: ['INBOX'],
      snippet: 's'.repeat(LIMITS.snippet + 1),
      hasAttachments: false,
    },
  });

  expectFieldError(email, 'metadata.snippet', `Snippet cannot exceed ${LIMITS.snippet} characters`);
});

runTest('rejects threadId longer than max length', () => {
  const email = buildValidEmail({
    metadata: {
      threadId: 't'.repeat(LIMITS.threadId + 1),
      labelIds: ['INBOX'],
      snippet: 'Short snippet',
      hasAttachments: false,
    },
  });

  expectFieldError(email, 'metadata.threadId', `Thread ID cannot exceed ${LIMITS.threadId} characters`);
});

runTest('rejects labelIds entries longer than max length', () => {
  const email = buildValidEmail({
    metadata: {
      threadId: 'thread-123',
      labelIds: ['l'.repeat(LIMITS.labelId + 1)],
      snippet: 'Short snippet',
      hasAttachments: false,
    },
  });

  expectFieldError(email, 'metadata.labelIds.0', `Label ID cannot exceed ${LIMITS.labelId} characters`);
});

runTest('rejects gmailId longer than max length', () => {
  const email = buildValidEmail({ gmailId: 'g'.repeat(LIMITS.gmailId + 1) });
  expectFieldError(email, 'gmailId', `Gmail ID cannot exceed ${LIMITS.gmailId} characters`);
});

console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}
