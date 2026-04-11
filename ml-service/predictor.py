# Model loader and prediction logic
# Loads ML model and vectorizer once at startup

import os
import sys
import joblib
import numpy as np
import json  # NEW: For metadata loading
import time  # NEW: For performance timing
import asyncio  # NEW: For async support
from datetime import datetime  # NEW: For timestamps
from concurrent.futures import ThreadPoolExecutor  # NEW: For async predictions

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from prediction_cache import init_cache, get_cache  # NEW: Prediction caching
import warnings

warnings.filterwarnings('ignore')

# Global variables for model and vectorizer
vectorizer = None
model = None
model_loaded = False
model_metadata = None  # NEW: Store model metadata

# NEW: Thread pool for async predictions
executor = ThreadPoolExecutor(max_workers=4)

# Model directory configuration (supports Docker volumes)
# In Docker: MODEL_DIR=/app/models (persisted volume)
# Local dev: MODEL_DIR not set (uses current directory)
MODEL_DIR = os.getenv('MODEL_DIR', os.path.dirname(__file__))

# Model file paths
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")
MODEL_PATH = os.path.join(MODEL_DIR, "phishing_model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")


def load_models():
    """
    Load the TF-IDF vectorizer and phishing detection model.
    If files don't exist, create dummy models for testing.
    """
    global vectorizer, model, model_loaded, model_metadata
    
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
            
            # NEW: Load model metadata if available
            if os.path.exists(METADATA_PATH):
                try:
                    with open(METADATA_PATH, 'r') as f:
                        model_metadata = json.load(f)
                    print(f"✅ Model metadata loaded (version: {model_metadata.get('version', 'unknown')})")
                except Exception as meta_error:
                    print(f"⚠️  Warning: Could not load metadata: {meta_error}")
                    model_metadata = {"version": "unknown", "warning": "Metadata file corrupted"}
            else:
                print("⚠️  Warning: No metadata file found (model_metadata.json)")
                # Create default metadata based on file mtime
                model_mtime = os.path.getmtime(MODEL_PATH)
                model_metadata = {
                    "version": datetime.fromtimestamp(model_mtime).strftime("%Y%m%d_%H%M%S"),
                    "trained_at": datetime.fromtimestamp(model_mtime).isoformat(),
                    "warning": "Metadata file missing - version inferred from file timestamp"
                }
            
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
            
            # NEW: Set dummy metadata
            model_metadata = {
                "version": "dummy_0.0.0",
                "trained_at": datetime.now().isoformat(),
                "model_type": "dummy",
                "warning": "Using dummy model for testing - train a real model for production"
            }
            
            print("✅ Dummy models created successfully")
            print("💡 To use real models, train and save:")
            print("   - vectorizer.pkl")
            print("   - phishing_model.pkl")
            print("   - model_metadata.json")
            model_loaded = True
        
        # NEW: Initialize prediction cache after models loaded
        cache = init_cache(max_size=10000, ttl_seconds=3600)  # 1 hour TTL
        version = model_metadata.get("version", "unknown") if model_metadata else "unknown"
        cache.current_model_version = version
        print(f"✅ Prediction cache initialized (version: {version})")
            
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
        
        # NEW: Reload metadata and invalidate cache
        new_metadata = None
        if os.path.exists(METADATA_PATH):
            try:
                with open(METADATA_PATH, 'r') as f:
                    new_metadata = json.load(f)
                print(f"✅ Metadata reloaded (version: {new_metadata.get('version', 'unknown')})")
            except Exception as metadata_error:
                print(f"⚠️ Warning: Could not load metadata: {str(metadata_error)}")
        
        model_metadata = new_metadata
        
        # NEW: Invalidate prediction cache on model reload
        cache = get_cache()
        if cache:
            new_version = new_metadata.get("version", "unknown") if new_metadata else "unknown"
            invalidated_count = cache.invalidate_all(new_version)
            print(f"🔄 Cache invalidated: {invalidated_count} entries cleared")
        
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
    Returns: Dictionary with status information including versioning
    """
    status = {
        "loaded": model_loaded,
        "vectorizer_exists": os.path.exists(VECTORIZER_PATH),
        "model_exists": os.path.exists(MODEL_PATH),
        "metadata_exists": os.path.exists(METADATA_PATH),  # NEW
        "vectorizer_path": VECTORIZER_PATH,
        "model_path": MODEL_PATH,
        "metadata_path": METADATA_PATH  # NEW
    }
    
    # Add file modification times if files exist
    if status["vectorizer_exists"]:
        status["vectorizer_mtime"] = os.path.getmtime(VECTORIZER_PATH)
    if status["model_exists"]:
        status["model_mtime"] = os.path.getmtime(MODEL_PATH)
    if status["metadata_exists"]:
        status["metadata_mtime"] = os.path.getmtime(METADATA_PATH)
    
    # NEW: Add metadata information if loaded
    if model_metadata:
        status["version"] = model_metadata.get("version", "unknown")
        status["trained_at"] = model_metadata.get("trained_at")
        status["model_type"] = model_metadata.get("model_type")
        status["accuracy"] = model_metadata.get("accuracy")
        status["f1_score"] = model_metadata.get("f1_score")
        # Include warning if present
        if "warning" in model_metadata:
            status["warning"] = model_metadata["warning"]
    
    return status


def _build_explanation(text_vectorized, top_k=5):
    """
    Build lightweight explainability data from model feature importance
    and TF-IDF activation values.

    Returns:
        dict: {
            "top_signals": [{"token": str, "score": float}],
            "method": str
        }
    """
    try:
        non_zero_indices = text_vectorized.indices
        if len(non_zero_indices) == 0:
            return {"top_signals": [], "method": "none"}

        tokens = vectorizer.get_feature_names_out()
        tfidf_values = text_vectorized.data

        if hasattr(model, 'feature_importances_'):
            feature_scores = model.feature_importances_
            method = "tfidf_x_feature_importance"
            combined_scores = []
            for idx, tfidf_val in zip(non_zero_indices, tfidf_values):
                importance = float(feature_scores[idx]) if idx < len(feature_scores) else 0.0
                combined_scores.append((idx, float(tfidf_val) * importance))
        else:
            method = "tfidf_weight"
            combined_scores = [(idx, float(tfidf_val)) for idx, tfidf_val in zip(non_zero_indices, tfidf_values)]

        combined_scores.sort(key=lambda item: item[1], reverse=True)
        top_features = combined_scores[:top_k]

        top_signals = [
            {
                "token": str(tokens[idx]),
                "score": round(float(score), 6)
            }
            for idx, score in top_features
            if idx < len(tokens)
        ]

        return {
            "top_signals": top_signals,
            "method": method
        }
    except Exception:
        # Explanation is best-effort and should not fail prediction flow.
        return {
            "top_signals": [],
            "method": "unavailable"
        }


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
        # NEW: Get model version for caching
        model_version = model_metadata.get("version", "unknown") if model_metadata else "unknown"
        
        # NEW: Check cache first
        cache = get_cache()
        if cache:
            cached_result = cache.get(text, model_version)
            if cached_result is not None:
                # Cache hit - return immediately
                return cached_result
        
        # Cache miss - perform prediction
        start_time = time.time()
        
        # Preprocess and vectorize the text
        text_vectorized = vectorizer.transform([text])
        
        # Get prediction (0 = safe, 1 = phishing)
        prediction = model.predict(text_vectorized)[0]
        
        # Get probability scores for both classes
        probabilities = model.predict_proba(text_vectorized)[0]
        
        # NEW: Calculate prediction latency
        prediction_time = time.time() - start_time
        
        explanation = _build_explanation(text_vectorized)

        # Format result with model version
        result = {
            "prediction": "phishing" if prediction == 1 else "safe",
            "confidence": float(max(probabilities)),  # Confidence in the prediction
            "probabilities": {
                "safe": float(probabilities[0]),
                "phishing": float(probabilities[1])
            },
            "explanation": explanation,
            "model_version": model_version
        }
        
        # NEW: Store in cache
        if cache:
            cache.set(text, model_version, result)
        
        # NEW: Log slow predictions
        if prediction_time > 0.1:  # > 100ms
            print(f"⚠️ Slow prediction: {prediction_time*1000:.1f}ms (text length: {len(text)} chars)")
        
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
        start_time = time.time()
        
        # Get model version for caching
        model_version = model_metadata.get("version", "unknown") if model_metadata else "unknown"
        
        # Validate all texts first
        validated_texts = []
        for i, text in enumerate(texts):
            if text is None or not isinstance(text, str):
                raise ValueError(f"Text at index {i} must be a string")
            if not text.strip():
                raise ValueError(f"Text at index {i} cannot be empty or whitespace-only")
            validated_texts.append(text)
        
        # NEW: Check cache for each text and collect misses
        cache = get_cache()
        results = [None] * len(validated_texts)  # Pre-allocate results array
        texts_to_predict = []  # Texts not in cache
        indices_to_predict = []  # Original indices for cache misses
        
        if cache:
            for i, text in enumerate(validated_texts):
                cached_result = cache.get(text, model_version)
                if cached_result is not None:
                    # Cache hit
                    results[i] = cached_result
                else:
                    # Cache miss - need to predict
                    texts_to_predict.append(text)
                    indices_to_predict.append(i)
        else:
            # No cache - predict all
            texts_to_predict = validated_texts
            indices_to_predict = list(range(len(validated_texts)))
        
        # If we have cache misses, batch-predict them
        if texts_to_predict:
            # Vectorize texts that need prediction
            texts_vectorized = vectorizer.transform(texts_to_predict)
            
            # Get predictions for cache misses
            predictions = model.predict(texts_vectorized)
            
            # Get probability scores for cache misses
            probabilities_array = model.predict_proba(texts_vectorized)
            
            # Format and store new predictions
            for row_position, (idx, pred, probs) in enumerate(zip(indices_to_predict, predictions, probabilities_array)):
                row_vector = texts_vectorized[row_position]
                explanation = _build_explanation(row_vector)

                result = {
                    "prediction": "phishing" if pred == 1 else "safe",
                    "confidence": float(max(probs)),
                    "probabilities": {
                        "safe": float(probs[0]),
                        "phishing": float(probs[1])
                    },
                    "explanation": explanation,
                    "model_version": model_version
                }
                results[idx] = result
                
                # Store in cache
                if cache:
                    cache.set(validated_texts[idx], model_version, result)
        
        # NEW: Log performance metrics
        total_time = time.time() - start_time
        cache_hits = len(validated_texts) - len(texts_to_predict)
        cache_hit_rate = (cache_hits / len(validated_texts)) * 100 if validated_texts else 0
        
        print(f"📊 Batch prediction: {len(validated_texts)} texts, "
              f"{cache_hits} cache hits ({cache_hit_rate:.1f}%), "
              f"{len(texts_to_predict)} predictions, "
              f"{total_time*1000:.1f}ms total")
        
        if total_time > 1.0:  # > 1 second
            print(f"⚠️ Slow batch prediction: {total_time:.2f}s for {len(validated_texts)} texts")
        
        return results
        
    except (ValueError, RuntimeError):
        # Re-raise validation and model errors as-is
        raise
    except Exception as e:
        raise RuntimeError(f"Batch prediction error: {str(e)}")


# NEW: Async wrappers for non-blocking predictions
async def predict_email_async(text):
    """
    Async wrapper for predict_email() - runs in thread pool to avoid blocking.
    
    Args:
        text (str): Email body text to analyze
        
    Returns:
        dict: Prediction result (same format as predict_email)
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, predict_email, text)


async def predict_emails_batch_async(texts):
    """
    Async wrapper for predict_emails_batch() - runs in thread pool to avoid blocking.
    
    Args:
        texts (list): List of email body texts to analyze
        
    Returns:
        list: List of prediction results (same format as predict_emails_batch)
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, predict_emails_batch, texts)


print("="*50)
load_models()
print("="*50 + "\n")
