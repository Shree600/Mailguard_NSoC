// Admin Controller
// Handles administrative operations like model retraining

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

/**
 * Trigger model retraining
 * POST /api/admin/retrain
 * 
 * This endpoint:
 * 1. Runs the Python retraining script
 * 2. Waits for completion
 * 3. Triggers model reload in ML service
 * 4. Returns comprehensive status
 */
exports.triggerRetraining = async (req, res) => {
  try {
    console.log('🔄 Retraining request received...');
    
    // Configuration
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const DATASET_BUILDER_PATH = path.join(__dirname, '../../ml-service/dataset_builder.py');
    const RETRAIN_SCRIPT_PATH = path.join(__dirname, '../../ml-service/retrain.py');
    const TRAINING_DATA = req.body.dataFile || 'training.csv';
    const MODEL_TYPE = req.body.modelType || 'random_forest';
    
    console.log(`📊 Configuration:`);
    console.log(`   ML Service: ${ML_SERVICE_URL}`);
    console.log(`   Training data: ${TRAINING_DATA}`);
    console.log(`   Model type: ${MODEL_TYPE}`);
    
    // Step 1: Check if ML service is available
    console.log('\n🔍 Step 1: Checking ML service availability...');
    try {
      await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
      console.log('✅ ML service is available');
    } catch (error) {
      console.log('❌ ML service is not available');
      return res.status(503).json({
        success: false,
        error: 'ML service is not available. Please start it first.',
        details: 'Run: cd ml-service && uvicorn app:app --reload --port 8000'
      });
    }
    
    // Step 2: Build training dataset from feedback
    console.log('\n📊 Step 2: Building training dataset from feedback...');
    
    const datasetResult = await new Promise((resolve, reject) => {
      const args = [
        DATASET_BUILDER_PATH,
        '--output', TRAINING_DATA
      ];
      
      console.log(`   Command: python ${args.join(' ')}`);
      
      const pythonProcess = spawn('python', args, {
        cwd: path.join(__dirname, '../../ml-service')
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dataset building completed successfully');
          resolve({ success: true, stdout, stderr, code });
        } else {
          console.log(`❌ Dataset building failed with code ${code}`);
          reject({ success: false, stdout, stderr, code });
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.log(`❌ Failed to start dataset builder: ${error.message}`);
        reject({ success: false, error: error.message });
      });
      
      setTimeout(() => {
        pythonProcess.kill();
        reject({ success: false, error: 'Dataset building timeout (2 minutes)' });
      }, 2 * 60 * 1000);
    });
    
    // Step 3: Run retraining script
    console.log('\n🚀 Step 3: Starting model retraining...');
    
    const retrainResult = await new Promise((resolve, reject) => {
      // Build command arguments
      const args = [
        RETRAIN_SCRIPT_PATH,
        '--data', TRAINING_DATA,
        '--model', MODEL_TYPE
      ];
      
      console.log(`   Command: python ${args.join(' ')}`);
      
      // Spawn Python process
      const pythonProcess = spawn('python', args, {
        cwd: path.join(__dirname, '../../ml-service')
      });
      
      let stdout = '';
      let stderr = '';
      
      // Capture stdout
      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        // Log progress in real-time
        process.stdout.write(text);
      });
      
      // Capture stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Handle completion
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Retraining completed successfully');
          resolve({ success: true, stdout, stderr, code });
        } else {
          console.log(`❌ Retraining failed with code ${code}`);
          reject({ success: false, stdout, stderr, code });
        }
      });
      
      // Handle errors
      pythonProcess.on('error', (error) => {
        console.log(`❌ Failed to start retraining: ${error.message}`);
        reject({ success: false, error: error.message });
      });
      
      // Set timeout (5 minutes max)
      setTimeout(() => {
        pythonProcess.kill();
        reject({ success: false, error: 'Retraining timeout (5 minutes)' });
      }, 5 * 60 * 1000);
    });
    
    // Step 4: Reload model in ML service
    console.log('\n🔄 Step 4: Reloading model in ML service...');
    try {
      const reloadResponse = await axios.post(
        `${ML_SERVICE_URL}/reload`,
        {},
        { timeout: 10000 }
      );
      
      if (reloadResponse.data.success) {
        console.log('✅ Model reloaded successfully');
      } else {
        console.log('⚠️  Model reload returned non-success status');
      }
    } catch (error) {
      console.log('❌ Failed to reload model:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Retraining succeeded but model reload failed',
        details: error.message,
        retraining: 'completed',
        reload: 'failed'
      });
    }
    
    // Success response
    console.log('\n✅ Complete retraining pipeline finished successfully!\n');
    
    return res.json({
      success: true,
      message: 'Model retrained and reloaded successfully',
      steps: {
        datasetBuilding: 'completed',
        retraining: 'completed',
        reload: 'completed'
      },
      config: {
        dataFile: TRAINING_DATA,
        modelType: MODEL_TYPE
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in retraining process:', error);
    
    // Check if it's a retraining failure
    if (error.code !== undefined) {
      return res.status(500).json({
        success: false,
        error: 'Model retraining failed',
        exitCode: error.code,
        stderr: error.stderr,
        details: 'Check logs for details'
      });
    }
    
    // Generic error
    return res.status(500).json({
      success: false,
      error: 'Retraining process failed',
      details: error.message || 'Unknown error'
    });
  }
};

/**
 * Get retraining status/info
 * GET /api/admin/retrain/status
 */
exports.getRetrainingStatus = async (req, res) => {
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    
    // Get model status from ML service
    const response = await axios.get(`${ML_SERVICE_URL}/model/status`);
    
    return res.json({
      success: true,
      mlService: {
        available: true,
        url: ML_SERVICE_URL,
        modelStatus: response.data
      }
    });
    
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: 'ML service not available',
      details: error.message
    });
  }
};

/**
 * Build dataset before retraining
 * POST /api/admin/dataset/build
 */
exports.buildDataset = async (req, res) => {
  try {
    console.log('📊 Dataset build request received...');
    
    const DATASET_BUILDER_PATH = path.join(__dirname, '../../ml-service/dataset_builder.py');
    const OUTPUT_FILE = req.body.outputFile || 'training.csv';
    
    console.log(`   Output file: ${OUTPUT_FILE}`);
    
    // Run dataset builder
    const buildResult = await new Promise((resolve, reject) => {
      const args = [DATASET_BUILDER_PATH, '--output', OUTPUT_FILE];
      
      console.log(`   Command: python ${args.join(' ')}`);
      
      const pythonProcess = spawn('python', args, {
        cwd: path.join(__dirname, '../../ml-service')
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dataset built successfully');
          resolve({ success: true, stdout, stderr, code });
        } else {
          console.log(`❌ Dataset build failed with code ${code}`);
          reject({ success: false, stdout, stderr, code });
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject({ success: false, error: error.message });
      });
      
      // Timeout: 2 minutes
      setTimeout(() => {
        pythonProcess.kill();
        reject({ success: false, error: 'Dataset build timeout (2 minutes)' });
      }, 2 * 60 * 1000);
    });
    
    return res.json({
      success: true,
      message: 'Dataset built successfully',
      outputFile: OUTPUT_FILE,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error building dataset:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Dataset build failed',
      details: error.message || error.stderr || 'Unknown error'
    });
  }
};
