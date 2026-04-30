const { validate, schemas } = require('./middleware/validation');

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
};

const runTests = () => {
  console.log('Running invalid-input tests for Gmail fetch route validation...');
  
  const middleware = validate(schemas.gmailFetch, 'body');
  
  // Helper to create mock req/res
  const createMocks = (body) => {
    const req = { body };
    const res = {
      statusCode: null,
      data: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    return { req, res, next, getNextCalled: () => nextCalled };
  };

  // Test case 1: Invalid maxResults (too large)
  const { req: req1, res: res1, next: next1, getNextCalled: next1Called } = createMocks({ maxResults: 1000 });
  middleware(req1, res1, next1);
  
  assert(!next1Called(), 'Next should not be called for invalid maxResults');
  assert(res1.statusCode === 400, 'Status code should be 400 for invalid maxResults');
  assert(res1.data && res1.data.success === false, 'Response success should be false');
  assert(res1.data.errors.some(e => e.field === 'maxResults'), 'Should have error for maxResults');
  console.log('✔️  Caught invalid maxResults (> 500)');
  
  // Test case 2: Invalid maxResults (negative)
  const { req: req2, res: res2, next: next2, getNextCalled: next2Called } = createMocks({ maxResults: -10 });
  middleware(req2, res2, next2);
  
  assert(!next2Called(), 'Next should not be called for negative maxResults');
  assert(res2.statusCode === 400, 'Status code should be 400 for negative maxResults');
  assert(res2.data.errors.some(e => e.field === 'maxResults'), 'Should have error for maxResults');
  console.log('✔️  Caught invalid maxResults (< 1)');

  // Test case 3: Invalid timeRange
  const { req: req3, res: res3, next: next3, getNextCalled: next3Called } = createMocks({ timeRange: 'invalid_time' });
  middleware(req3, res3, next3);
  
  assert(!next3Called(), 'Next should not be called for invalid timeRange');
  assert(res3.statusCode === 400, 'Status code should be 400 for invalid timeRange');
  assert(res3.data.errors.some(e => e.field === 'timeRange'), 'Should have error for timeRange');
  console.log('✔️  Caught invalid timeRange');

  // Test case 4: Invalid date format
  const { req: req4, res: res4, next: next4, getNextCalled: next4Called } = createMocks({ dateFrom: 'not-a-date' });
  middleware(req4, res4, next4);
  
  assert(!next4Called(), 'Next should not be called for invalid date format');
  assert(res4.statusCode === 400, 'Status code should be 400 for invalid date format');
  assert(res4.data.errors.some(e => e.field === 'dateFrom'), 'Should have error for dateFrom');
  console.log('✔️  Caught invalid dateFrom format');

  // Test case 5: Valid input should pass
  const { req: req5, res: res5, next: next5, getNextCalled: next5Called } = createMocks({ 
    maxResults: 50, 
    timeRange: '1h',
    fetchAll: true
  });
  middleware(req5, res5, next5);
  
  assert(next5Called(), 'Next should be called for valid input');
  assert(req5.body.maxResults === 50, 'Valid input should be parsed and replace body');
  assert(req5.body.timeRange === '1h', 'Valid enum should be parsed');
  assert(req5.body.fetchAll === true, 'Valid boolean should be parsed');
  console.log('✔️  Valid input passed successfully');

  console.log('✅ All invalid-input tests passed!');
  process.exit(0);
};

runTests();
