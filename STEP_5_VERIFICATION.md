# Step 5 Verification Guide - Model Hot-Reload

## Manual Testing Steps

### Prerequisites
Ensure you have the model files in ml-service directory:
- `vectorizer.pkl`
- `phishing_model.pkl`

---

## Step 1: Start the ML Service

Open a terminal and run:
```bash
cd ml-service
uvicorn app:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
==================================================
🚀 Initializing ML Service
==================================================
📦 Loading existing models...
✅ Models loaded successfully from disk
==================================================
```

---

## Step 2: Test Health Endpoint

In a new terminal:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"ok"}
```

---

## Step 3: Test Model Status

```bash
curl http://localhost:8000/model/status
```

Expected response:
```json
{
  "success": true,
  "model_loaded": true,
  "vectorizer_exists": true,
  "model_exists": true,
  "vectorizer_path": "...",
  "model_path": "...",
  "model_mtime": 1738406517.123
}
```

---

## Step 4: Make a Prediction (Before Reload)

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Congratulations! You won a million dollars!\"}"
```

Expected response:
```json
{
  "prediction": "phishing",
  "confidence": 0.58,
  "probabilities": {
    "safe": 0.42,
    "phishing": 0.58
  }
}
```

Note the prediction and confidence.

---

## Step 5: Retrain the Model (Optional)

If you want to test with a newly trained model:

```bash
cd ml-service
python retrain.py --data sample_training.csv
```

This will create new model files.

---

## Step 6: Reload Models (Hot-Reload Test!)

**WITHOUT RESTARTING THE SERVICE**, trigger a reload:

```bash
curl -X POST http://localhost:8000/reload
```

Expected response:
```json
{
  "success": true,
  "message": "Models reloaded successfully",
  "status": "Models reloaded successfully",
  "model_loaded": true,
  "timestamp": 1738406600.456
}
```

In the ML service terminal, you should see:
```
==================================================
🔄 Reloading models from disk...
==================================================
📦 Loading vectorizer from: vectorizer.pkl
✅ Vectorizer loaded
📦 Loading model from: phishing_model.pkl
✅ Model loaded
✅ Models reloaded successfully!
==================================================
```

---

## Step 7: Make Another Prediction (After Reload)

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Meeting scheduled for tomorrow at 2pm\"}"
```

Expected response:
```json
{
  "prediction": "safe",
  "confidence": 0.64,
  "probabilities": {
    "safe": 0.64,
    "phishing": 0.36
  }
}
```

✅ **SUCCESS!** The model is working with reloaded files.

---

## Step 8: Run Automated Test Suite

If the service is running:

```bash
python test-reload.py
```

This will run all 6 tests automatically:
1. ✅ Health check
2. ✅ Model status before reload
3. ✅ Prediction before reload
4. ✅ Model reload
5. ✅ Prediction after reload
6. ✅ Multiple predictions

---

## PowerShell Commands (Windows)

If using PowerShell:

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8000/health"

# Model status
Invoke-RestMethod -Uri "http://localhost:8000/model/status"

# Prediction
Invoke-RestMethod -Uri "http://localhost:8000/predict" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"text": "Click here to claim your prize!"}'

# Reload
Invoke-RestMethod -Uri "http://localhost:8000/reload" `
  -Method POST
```

---

## Success Criteria

✅ Service starts without errors
✅ Models load successfully
✅ Predictions work
✅ `/reload` endpoint returns success
✅ Models reload without restarting service
✅ Predictions work after reload
✅ **NO DOWNTIME** during model update

---

## What We Achieved

🎯 **Hot-Reload Capability**
- Models can be updated without stopping the service
- Zero downtime for model deployments
- Instant model updates

🎯 **New Endpoints**
- `POST /reload` - Reload models from disk
- `GET /model/status` - Check model status

🎯 **Enhanced predictor.py**
- `reload_model()` - Reloads both vectorizer and model
- Enhanced `get_model_status()` - Returns file timestamps

---

## Integration with Retraining Pipeline

```
Step 3: Dataset Builder → training.csv
Step 4: Retrain Script → new .pkl files
Step 5: Hot-Reload ← YOU ARE HERE
  ↓
POST /reload → Loads new models
  ↓
Predictions use new model immediately!
  ↓
No service restart needed! 🎉
```

---

## Next Steps (Step 6)

Create a backend endpoint that:
1. Calls `python retrain.py`
2. Calls ML service `/reload`
3. Returns status to user

This will allow retraining from the web interface!
