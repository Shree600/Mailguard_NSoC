// Environment Variable Validation
// Validates required environment variables at startup

const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'CLERK_SECRET_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'ML_SERVICE_URL'
  ];

  // ENCRYPTION_KEY is required outside local development for secure token storage
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment && !process.env.ENCRYPTION_KEY) {
    required.push('ENCRYPTION_KEY');
  }

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

  if (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.startsWith('http')) {
    warnings.push('GOOGLE_REDIRECT_URI should start with http:// or https://');
  }

  // Validate ENCRYPTION_KEY format (must be 64 hex characters for AES-256)
  if (process.env.ENCRYPTION_KEY) {
    if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
      warnings.push('ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes for AES-256). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
  } else if (isDevelopment) {
    warnings.push('ENCRYPTION_KEY not set. Using insecure default for development only.');
  }

  // Warn if FRONTEND_URL not set (will default to localhost:3000)
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL not set. CORS will allow http://localhost:3000 by default. Set this in production!');
  } else if (!process.env.FRONTEND_URL.startsWith('http')) {
    warnings.push('FRONTEND_URL should start with http:// or https://');
  }

  // Report issues
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️ Environment variable warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('');
  }

  // Success
  console.log('✅ Environment variables validated');
};

// ============================================
// ML SERVICE CONNECTIVITY CHECK
// ============================================

/**
 * Validates that the ML service is reachable at startup
 * Non-blocking - won't crash the backend if ML service is down
 */
async function validateMLServiceReachability() {
    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (!mlServiceUrl) {
        console.warn('⚠️ ML_SERVICE_URL not set - skipping connectivity check');
        return false;
    }
    
    console.log(`🔍 Checking ML service connectivity: ${mlServiceUrl}/health`);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${mlServiceUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ ML service reachable at ${mlServiceUrl}`);
            if (data.model_loaded) {
                console.log(`   Model loaded: ${data.model_loaded}`);
                console.log(`   Model version: ${data.model_version || 'unknown'}`);
            }
            return true;
        } else {
            console.warn(`⚠️ ML service responded with status ${response.status} at ${mlServiceUrl}`);
            return false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`⚠️ ML service timeout after 5 seconds at ${mlServiceUrl}`);
        } else {
            console.warn(`⚠️ ML service unreachable at ${mlServiceUrl}: ${error.message}`);
            console.warn(`   Please ensure ML service is running at: ${mlServiceUrl}`);
            console.warn(`   You can start it with: cd ml-service && python app.py`);
        }
        return false;
    }
}

// Run connectivity check asynchronously (non-blocking, won't crash backend)
if (process.env.NODE_ENV !== 'test') {
    validateMLServiceReachability().catch(err => {
        console.warn('⚠️ Background connectivity check failed:', err.message);
    });
}

module.exports = validateEnv;
module.exports.validateMLServiceReachability = validateMLServiceReachability;