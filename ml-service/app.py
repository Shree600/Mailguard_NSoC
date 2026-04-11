# FastAPI ML Service for Phishing Detection
# Main application entry point

import sys

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import List, Dict, Any
import predictor  # Import predictor to load models at startup
from prediction_cache import get_cache  # NEW: For cache stats endpoint
import traceback

# Initialize FastAPI app
app = FastAPI(
    title="Phishing Detection ML Service",
    description="Machine Learning microservice for email phishing detection",
    version="1.0.0"
)

# Configure CORS to allow requests from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to prevent service crashes.
    Returns a structured error response for any unhandled exception.
    """
    print(f"❌ Unhandled exception: {str(exc)}")
    print(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "type": type(exc).__name__
        }
    )


# Validation error handler for request parsing errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle request validation errors with user-friendly messages.
    """
    print(f"❌ Validation error: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "Request validation failed",
            "detail": exc.errors(),
            "message": "Please check your request format and try again"
        }
    )


# Request model for prediction
class PredictionRequest(BaseModel):
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Congratulations! You've won $1,000,000. Click here to claim your prize now!"
            }
        }


# Response model for prediction
class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict
    explanation: Dict[str, Any]
    model_version: str  # NEW: Include model version for tracking


# Batch prediction request/response models
class BatchPredictionRequest(BaseModel):
    texts: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "texts": [
                    "Click here to win $1,000,000",
                    "Meeting scheduled for tomorrow at 3pm"
                ]
            }
        }


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    count: int


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify service is running and model is loaded.
    Used by Docker health checks and load balancers.
    Returns: Status message with model status
    Raises: HTTPException 503 if model is not loaded
    """
    model_status = predictor.get_model_status()
    
    # Critical: Service is only healthy if model is loaded
    if not model_status["loaded"]:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable: Model not loaded"
        )
    
    return {
        "status": "ok",
        "model_loaded": True,
        "model_version": model_status.get("version", "unknown")
    }


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with service information
    Returns: Service name and version
    """
    model_status = predictor.get_model_status()
    return {
        "service": "Phishing Detection ML Service",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": model_status["loaded"]
    }


# Prediction endpoint
@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict if email text is phishing or safe.
    
    Args:
        request: PredictionRequest with email text
        
    Returns:
        PredictionResponse with prediction, confidence, and probabilities
    """
    try:
        # Validate input
        if not request.text or request.text.strip() == "":
            raise HTTPException(status_code=400, detail="Email text cannot be empty")
        
        # Make prediction (async - non-blocking)
        result = await predictor.predict_email_async(request.text)
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        # Input validation errors (empty text, wrong type, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Model loading or prediction errors
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Unexpected errors
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# Batch prediction endpoint
@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """
    Predict multiple emails at once for better performance.
    
    Args:
        request: BatchPredictionRequest with list of email texts
        
    Returns:
        BatchPredictionResponse with list of predictions and count
    """
    try:
        # Validate input
        if not request.texts:
            raise HTTPException(status_code=400, detail="Texts list cannot be empty")
        
        if len(request.texts) > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 texts per batch")
        
        # Make batch prediction (async - non-blocking)
        results = await predictor.predict_emails_batch_async(request.texts)
        
        return {
            "predictions": results,
            "count": len(results)
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        # Input validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Model loading or prediction errors
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Unexpected errors
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


# Model reload endpoint
@app.post("/reload")
async def reload_models():
    """
    Reload the ML models from disk without restarting the service.
    This endpoint should be called after retraining the model.
    
    Returns:
        Status information about the reload operation
    """
    try:
        # Reload models
        result = predictor.reload_model()
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "status": "Models reloaded successfully",
                "model_loaded": result["loaded"],
                "timestamp": result.get("model_mtime", None)
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=result.get("error", "Failed to reload models")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload error: {str(e)}")


# Model status endpoint
@app.get("/model/status")
async def get_model_status():
    """
    Get current model loading status and file information.
    
    Returns:
        Model status information including file paths, modification times, and versioning
    """
    try:
        status = predictor.get_model_status()
        return {
            "success": True,
            "model_loaded": status["loaded"],
            "vectorizer_exists": status["vectorizer_exists"],
            "model_exists": status["model_exists"],
            "metadata_exists": status.get("metadata_exists", False),  # NEW
            "vectorizer_path": status["vectorizer_path"],
            "model_path": status["model_path"],
            "metadata_path": status.get("metadata_path"),  # NEW
            "vectorizer_mtime": status.get("vectorizer_mtime"),
            "model_mtime": status.get("model_mtime"),
            "metadata_mtime": status.get("metadata_mtime"),  # NEW
            # NEW: Include versioning information
            "version": status.get("version"),
            "trained_at": status.get("trained_at"),
            "model_type": status.get("model_type"),
            "accuracy": status.get("accuracy"),
            "f1_score": status.get("f1_score"),
            "warning": status.get("warning")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")

# NEW: Cache statistics endpoint
@app.get("/cache/stats")
async def get_cache_stats():
    """
    Get prediction cache performance statistics.
    
    Returns:
        Cache metrics including size, hit rate, evictions, etc.
    """
    try:
        cache = get_cache()
        if not cache:
            return {
                "success": False,
                "message": "Cache not initialized"
            }
        
        stats = cache.get_stats()
        return {
            "success": True,
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache stats error: {str(e)}")


# NEW: Clear cache endpoint
@app.post("/cache/clear")
async def clear_cache():
    """
    Clear all cached predictions.
    
    Returns:
        Success status and number of entries cleared
    """
    try:
        cache = get_cache()
        if not cache:
            return {
                "success": False,
                "message": "Cache not initialized"
            }
        
        cleared_count = cache.clear()
        return {
            "success": True,
            "message": f"Cache cleared: {cleared_count} entries removed",
            "cleared_count": cleared_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache clear error: {str(e)}")