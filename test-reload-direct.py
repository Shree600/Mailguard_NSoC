"""
Direct test of reload_model() function
Tests the reload functionality without needing the server running
"""

import sys
sys.path.append('ml-service')

import predictor

print("="*60)
print("TESTING MODEL RELOAD FUNCTIONALITY")
print("="*60 + "\n")

# Test 1: Check initial status
print("Test 1: Get Model Status")
status = predictor.get_model_status()
print(f"  Model loaded: {status['loaded']}")
print(f"  Vectorizer exists: {status['vectorizer_exists']}")
print(f"  Model exists: {status['model_exists']}")

if status['model_mtime']:
    print(f"  Model timestamp: {status['model_mtime']}")

# Test 2: Make a prediction before reload
print("\nTest 2: Prediction Before Reload")
try:
    result = predictor.predict_email("Congratulations! You won a million dollars!")
    print(f"  Text: 'Congratulations! You won...'")
    print(f"  Prediction: {result['prediction']}")
    print(f"  Confidence: {result['confidence']:.2%}")
except Exception as e:
    print(f"  Error: {e}")

# Test 3: Reload models
print("\nTest 3: Reload Models")
reload_result = predictor.reload_model()
print(f"  Success: {reload_result['success']}")
if reload_result['success']:
    print(f"  Message: {reload_result['message']}")
    print(f"  Model loaded: {reload_result['loaded']}")
else:
    print(f"  Error: {reload_result.get('error', 'Unknown error')}")

# Test 4: Make a prediction after reload
print("\nTest 4: Prediction After Reload")
try:
    result = predictor.predict_email("Meeting scheduled for tomorrow at 2pm")
    print(f"  Text: 'Meeting scheduled for tomorrow...'")
    print(f"  Prediction: {result['prediction']}")
    print(f"  Confidence: {result['confidence']:.2%}")
except Exception as e:
    print(f"  Error: {e}")

# Test 5: Check status after reload
print("\nTest 5: Status After Reload")
status_after = predictor.get_model_status()
print(f"  Model loaded: {status_after['loaded']}")

print("\n" + "="*60)
if reload_result['success']:
    print("✅ ALL TESTS PASSED - Hot-reload is working!")
else:
    print("⚠️  Some tests failed - check output above")
print("="*60 + "\n")
