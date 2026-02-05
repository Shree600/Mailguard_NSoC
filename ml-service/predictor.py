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
            
            # Validate file sizes (corrupted files are often 0 bytes or very small)
            vectorizer_size = os.path.getsize(VECTORIZER_PATH)
            model_size = os.path.getsize(MODEL_PATH)
            
            if vectorizer_size < 100:  # Less than 100 bytes is likely corrupted
                raise RuntimeError(
                    f"Vectorizer file appears corrupted (size: {vectorizer_size} bytes). "
                    "Please retrain the model."
                )
            
            if model_size < 100:
                raise RuntimeError(
                    f"Model file appears corrupted (size: {model_size} bytes). "
                    "Please retrain the model."
                )
            
            print(f"   Vectorizer: {vectorizer_size:,} bytes")
            print(f"   Model: {model_size:,} bytes")
            
            # Try to load vectorizer with corruption detection
            try:
                vectorizer = joblib.load(VECTORIZER_PATH)
                print("✅ Vectorizer loaded successfully")
            except Exception as load_error:
                raise RuntimeError(
                    f"Failed to load vectorizer file (may be corrupted): {str(load_error)}. "
                    "Please retrain the model."
                )
            
            # Try to load model with corruption detection
            try:
                model = joblib.load(MODEL_PATH)
                print("✅ Model loaded successfully")
            except Exception as load_error:
                raise RuntimeError(
                    f"Failed to load model file (may be corrupted): {str(load_error)}. "
                    "Please retrain the model."
                )
            
            # Verify loaded objects are valid
            if not hasattr(vectorizer, 'transform'):
                raise RuntimeError(
                    "Loaded vectorizer is invalid (missing 'transform' method). "
                    "Please retrain the model."
                )
            
            if not hasattr(model, 'predict'):
                raise RuntimeError(
                    "Loaded model is invalid (missing 'predict' method). "
                    "Please retrain the model."
                )
            
            print("✅ Models loaded and validated successfully")
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
            
    except RuntimeError:
        # Re-raise RuntimeError as-is (already has good error message)
        print(f"❌ Failed to load models")
        model_loaded = False
        raise
    except Exception as e:
        print(f"❌ Unexpected error loading models: {str(e)}")
        model_loaded = False
        raise RuntimeError(f"Failed to initialize ML models: {str(e)}")


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
        
        # Validate file sizes
        vectorizer_size = os.path.getsize(VECTORIZER_PATH)
        model_size = os.path.getsize(MODEL_PATH)
        
        if vectorizer_size < 100:
            error_msg = f"Vectorizer file appears corrupted (size: {vectorizer_size} bytes)"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        if model_size < 100:
            error_msg = f"Model file appears corrupted (size: {model_size} bytes)"
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
        print(f"   File size: {vectorizer_size:,} bytes")
        
        # Try to load vectorizer with corruption detection
        try:
            new_vectorizer = joblib.load(VECTORIZER_PATH)
        except Exception as load_error:
            error_msg = f"Failed to load vectorizer (may be corrupted): {str(load_error)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        print("✅ Vectorizer loaded")
        
        print(f"📦 Loading model from: {MODEL_PATH}")
        print(f"   File size: {model_size:,} bytes")
        
        # Try to load model with corruption detection
        try:
            new_model = joblib.load(MODEL_PATH)
        except Exception as load_error:
            error_msg = f"Failed to load model (may be corrupted): {str(load_error)}"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        print("✅ Model loaded")
        
        # Verify loaded objects are valid
        if not hasattr(new_vectorizer, 'transform'):
            error_msg = "Loaded vectorizer is invalid (missing 'transform' method)"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        if not hasattr(new_model, 'predict'):
            error_msg = "Loaded model is invalid (missing 'predict' method)"
            print(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "loaded": model_loaded
            }
        
        # Update global variables (atomic update)
        vectorizer = new_vectorizer
        model = new_model
        model_loaded = True
        
        print("✅ Models reloaded and validated successfully!")
        print("="*50 + "\n")
        
        return {
            "success": True,
            "message": "Models reloaded successfully",
            "loaded": True,
            "vectorizer_updated": True,
            "model_updated": True,
            "vectorizer_mtime": vectorizer_mtime,
            "model_mtime": model_mtime,
            "vectorizer_size": vectorizer_size,
            "model_size": model_size
        }
        
    except Exception as e:
        error_msg = f"Unexpected error reloading models: {str(e)}"
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
    
    # Validate input text
    if text is None or not isinstance(text, str):
        raise ValueError("Email text must be a string")
    
    if not text.strip():
        raise ValueError("Email text cannot be empty or whitespace-only")
    
    # Check if models are loaded
    if not model_loaded or vectorizer is None or model is None:
        raise RuntimeError(
            "ML models are not loaded. Please check model files exist: "
            f"vectorizer.pkl and phishing_model.pkl"
        )
    
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
        
    except (ValueError, RuntimeError):
        # Re-raise validation and model errors as-is
        raise
    except Exception as e:
        raise RuntimeError(f"Prediction error: {str(e)}")


def predict_emails_batch(texts):
    """
    Predict multiple emails at once for better performance.
    
    Args:
        texts (list): List of email body texts to analyze
        
    Returns:
        list: List of prediction results, one for each input text
            Each result is a dict with:
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
    
    # Validate input
    if not isinstance(texts, list):
        raise ValueError("Input must be a list of texts")
    
    if not texts:
        raise ValueError("Input list cannot be empty")
    
    # Check if models are loaded
    if not model_loaded or vectorizer is None or model is None:
        raise RuntimeError(
            "ML models are not loaded. Please check model files exist: "
            f"vectorizer.pkl and phishing_model.pkl"
        )
    
    try:
        results = []
        
        # Validate all texts first
        validated_texts = []
        for i, text in enumerate(texts):
            if text is None or not isinstance(text, str):
                raise ValueError(f"Text at index {i} must be a string")
            if not text.strip():
                raise ValueError(f"Text at index {i} cannot be empty or whitespace-only")
            validated_texts.append(text)
        
        # Vectorize all texts at once (more efficient than one-by-one)
        texts_vectorized = vectorizer.transform(validated_texts)
        
        # Get predictions for all texts
        predictions = model.predict(texts_vectorized)
        
        # Get probability scores for all texts
        probabilities_array = model.predict_proba(texts_vectorized)
        
        # Format results
        for pred, probs in zip(predictions, probabilities_array):
            result = {
                "prediction": "phishing" if pred == 1 else "safe",
                "confidence": float(max(probs)),
                "probabilities": {
                    "safe": float(probs[0]),
                    "phishing": float(probs[1])
                }
            }
            results.append(result)
        
        return results
        
    except (ValueError, RuntimeError):
        # Re-raise validation and model errors as-is
        raise
    except Exception as e:
        raise RuntimeError(f"Batch prediction error: {str(e)}")


# Load models when module is imported
print("\n" + "="*50)
print("🚀 Initializing ML Service")
print("="*50)
load_models()
print("="*50 + "\n")
