# Model loader and prediction logic
# Loads ML model and vectorizer once at startup

import os
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import warnings

warnings.filterwarnings('ignore')

# Global variables for model and vectorizer
vectorizer = None
model = None
model_loaded = False

# Model file paths
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), "vectorizer.pkl")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "phishing_model.pkl")


def load_models():
    """
    Load the TF-IDF vectorizer and phishing detection model.
    If files don't exist, create dummy models for testing.
    """
    global vectorizer, model, model_loaded
    
    try:
        # Try to load existing models
        if os.path.exists(VECTORIZER_PATH) and os.path.exists(MODEL_PATH):
            print("📦 Loading existing models...")
            vectorizer = joblib.load(VECTORIZER_PATH)
            model = joblib.load(MODEL_PATH)
            print("✅ Models loaded successfully from disk")
            model_loaded = True
        else:
            # Create dummy models for testing
            print("⚠️  Model files not found. Creating dummy models for testing...")
            print(f"   Expected: {VECTORIZER_PATH}")
            print(f"   Expected: {MODEL_PATH}")
            
            # Create a simple TF-IDF vectorizer
            vectorizer = TfidfVectorizer(max_features=3000, stop_words='english')
            
            # Fit with dummy data
            dummy_texts = [
                "Congratulations! You won a prize. Click here to claim.",
                "Your account has been suspended. Verify now.",
                "Meeting scheduled for tomorrow at 3pm.",
                "Please review the attached document.",
                "URGENT: Your password will expire today!"
            ]
            dummy_labels = [1, 1, 0, 0, 1]  # 1=phishing, 0=safe
            
            # Fit vectorizer and train dummy model
            X_dummy = vectorizer.fit_transform(dummy_texts)
            model = MultinomialNB()
            model.fit(X_dummy, dummy_labels)
            
            print("✅ Dummy models created successfully")
            print("💡 To use real models, train and save:")
            print("   - vectorizer.pkl")
            print("   - phishing_model.pkl")
            model_loaded = True
            
    except Exception as e:
        print(f"❌ Error loading models: {str(e)}")
        model_loaded = False
        raise


def reload_model():
    """
    Reload the models from disk without restarting the service.
    This allows hot-reloading after model retraining.
    
    Returns:
        dict: Status information about the reload
    """
    global vectorizer, model, model_loaded
    
    try:
        print("\n" + "="*50)
        print("🔄 Reloading models from disk...")
        print("="*50)
        
        # Check if model files exist
        if not os.path.exists(VECTORIZER_PATH):
            error_msg = f"Vectorizer file not found: {VECTORIZER_PATH}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        if not os.path.exists(MODEL_PATH):
            error_msg = f"Model file not found: {MODEL_PATH}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        # Get file modification times for tracking
        vectorizer_mtime = os.path.getmtime(VECTORIZER_PATH)
        model_mtime = os.path.getmtime(MODEL_PATH)
        
        print(f"📦 Loading vectorizer from: {VECTORIZER_PATH}")
        new_vectorizer = joblib.load(VECTORIZER_PATH)
        print("✅ Vectorizer loaded")
        
        print(f"📦 Loading model from: {MODEL_PATH}")
        new_model = joblib.load(MODEL_PATH)
        print("✅ Model loaded")
        
        # Update global variables (atomic update)
        vectorizer = new_vectorizer
        model = new_model
        model_loaded = True
        
        print("✅ Models reloaded successfully!")
        print("="*50 + "\n")
        
        return {
            "success": True,
            "message": "Models reloaded successfully",
            "loaded": True,
            "vectorizer_updated": True,
            "model_updated": True,
            "vectorizer_mtime": vectorizer_mtime,
            "model_mtime": model_mtime
        }
        
    except Exception as e:
        error_msg = f"Error reloading models: {str(e)}"
        print(f"❌ {error_msg}")
        print("="*50 + "\n")
        return {
            "success": False,
            "error": error_msg,
            "loaded": model_loaded
        }


def get_model_status():
    """
    Get the current model loading status.
    Returns: Dictionary with status information
    """
    status = {
        "loaded": model_loaded,
        "vectorizer_exists": os.path.exists(VECTORIZER_PATH),
        "model_exists": os.path.exists(MODEL_PATH),
        "vectorizer_path": VECTORIZER_PATH,
        "model_path": MODEL_PATH
    }
    
    # Add file modification times if files exist
    if status["vectorizer_exists"]:
        status["vectorizer_mtime"] = os.path.getmtime(VECTORIZER_PATH)
    if status["model_exists"]:
        status["model_mtime"] = os.path.getmtime(MODEL_PATH)
    
    return status


def predict_email(text):
    """
    Predict if an email is phishing or safe.
    
    Args:
        text (str): Email body text to analyze
        
    Returns:
        dict: Prediction result with label and confidence
            {
                "prediction": "phishing" | "safe",
                "confidence": float (0-1),
                "probabilities": {
                    "safe": float,
                    "phishing": float
                }
            }
    """
    global vectorizer, model, model_loaded
    
    # Check if models are loaded
    if not model_loaded or vectorizer is None or model is None:
        raise Exception("Models not loaded. Please restart the service.")
    
    try:
        # Preprocess and vectorize the text
        text_vectorized = vectorizer.transform([text])
        
        # Get prediction (0 = safe, 1 = phishing)
        prediction = model.predict(text_vectorized)[0]
        
        # Get probability scores for both classes
        probabilities = model.predict_proba(text_vectorized)[0]
        
        # Format result
        result = {
            "prediction": "phishing" if prediction == 1 else "safe",
            "confidence": float(max(probabilities)),  # Confidence in the prediction
            "probabilities": {
                "safe": float(probabilities[0]),
                "phishing": float(probabilities[1])
            }
        }
        
        return result
        
    except Exception as e:
        raise Exception(f"Prediction error: {str(e)}")


# Load models when module is imported
print("\n" + "="*50)
print("🚀 Initializing ML Service")
print("="*50)
load_models()
print("="*50 + "\n")
