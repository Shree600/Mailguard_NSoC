// Environment Variable Validation
// Validates required environment variables at startup

const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'CLERK_SECRET_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'ML_SERVICE_URL'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check format of critical variables
  if (process.env.MONGO_URI && !process.env.MONGO_URI.startsWith('mongodb')) {
    warnings.push('MONGO_URI should start with mongodb:// or mongodb+srv://');
  }

  if (process.env.CLERK_SECRET_KEY && !process.env.CLERK_SECRET_KEY.startsWith('sk_')) {
    warnings.push('CLERK_SECRET_KEY should start with sk_');
  }

  if (process.env.ML_SERVICE_URL && !process.env.ML_SERVICE_URL.startsWith('http')) {
    warnings.push('ML_SERVICE_URL should start with http:// or https://');
  }

  // Report issues
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment variable warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('');
  }

  // Success
  console.log('✅ Environment variables validated');
};

module.exports = validateEnv;
