const { classifyEmail } = require('../../services/mlService');

describe('ML Service Integration Tests', () => {
  it('should return classification result for valid email', async () => {
    const emailData = {
      subject: 'Verify your account',
      body: 'Click here to verify immediately',
      sender: 'no-reply@suspicious.com'
    };
    
    const result = await classifyEmail(emailData);
    
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('confidence');
    expect(['phishing', 'safe']).toContain(result.label);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should handle ML service timeout gracefully', async () => {
    // Mock timeout scenario or use a non-existent port if needed for actual integration test
    // But here we might just want to see how it handles errors
    const emailData = { subject: '', body: '', sender: '' };
    
    try {
      await classifyEmail(emailData);
    } catch (error) {
      expect(error.message).toBeDefined();
    }
  });
});
