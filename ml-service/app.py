# FastAPI ML Service for Phishing Detection
# Main application entry point

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import predictor  # Import predictor to load models at startup

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


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify service is running
    Returns: Status message
    """
    return {"status": "ok"}


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
        
        # Make prediction
        result = predictor.predict_email(request.text)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
