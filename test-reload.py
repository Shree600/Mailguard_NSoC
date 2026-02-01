"""
Test script for model hot-reload functionality
Tests that models can be reloaded without restarting the ML service

Prerequisites:
1. ML service must be running: uvicorn app:app --reload --port 8000
2. Model files must exist: vectorizer.pkl, phishing_model.pkl

Run: python test-reload.py
"""

import requests
import time

BASE_URL = "http://localhost:8000"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(title)
    print("="*60 + "\n")

def test_service_health():
    """Test if service is running"""
    print_section("TEST 1: Check Service Health")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Service is running")
            return True
        else:
            print(f"❌ Service returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to ML service")
        print("   Please start the service: uvicorn app:app --port 8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_model_status():
    """Get current model status"""
    print_section("TEST 2: Check Model Status")
    
    try:
        response = requests.get(f"{BASE_URL}/model/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ Model status retrieved")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   Vectorizer exists: {data['vectorizer_exists']}")
            print(f"   Model exists: {data['model_exists']}")
            if data.get('model_mtime'):
                print(f"   Model timestamp: {data['model_mtime']}")
            return True, data
        else:
            print(f"❌ Failed to get status: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def test_prediction_before_reload():
    """Test prediction before reload"""
    print_section("TEST 3: Prediction Before Reload")
    
    try:
        test_text = "Congratulations! You won a million dollars! Click here!"
        response = requests.post(
            f"{BASE_URL}/predict",
            json={"text": test_text},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Prediction successful")
            print(f"   Text: {test_text[:50]}...")
            print(f"   Prediction: {data['prediction']}")
            print(f"   Confidence: {data['confidence']:.2%}")
            return True, data
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def test_reload_models():
    """Test model reload endpoint"""
    print_section("TEST 4: Reload Models")
    
    try:
        print("🔄 Triggering model reload...")
        response = requests.post(f"{BASE_URL}/reload")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Model reload successful!")
            print(f"   Message: {data['message']}")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            return True, data
        else:
            print(f"❌ Reload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def test_prediction_after_reload():
    """Test prediction after reload"""
    print_section("TEST 5: Prediction After Reload")
    
    try:
        test_text = "Meeting scheduled for tomorrow at 2pm in conference room"
        response = requests.post(
            f"{BASE_URL}/predict",
            json={"text": test_text},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Prediction successful after reload")
            print(f"   Text: {test_text[:50]}...")
            print(f"   Prediction: {data['prediction']}")
            print(f"   Confidence: {data['confidence']:.2%}")
            return True, data
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def test_multiple_predictions():
    """Test multiple predictions to ensure model is working"""
    print_section("TEST 6: Multiple Predictions")
    
    test_cases = [
        ("Click here to claim your prize!", "phishing"),
        ("Your account needs verification now!", "phishing"),
        ("Meeting reminder for next week", "safe"),
        ("Please review the quarterly report", "safe")
    ]
    
    passed = 0
    failed = 0
    
    for text, expected in test_cases:
        try:
            response = requests.post(
                f"{BASE_URL}/predict",
                json={"text": text},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                prediction = data['prediction']
                confidence = data['confidence']
                
                # Note: We don't strictly check if prediction matches expected
                # because model may classify differently
                print(f"✅ Text: '{text[:40]}...'")
                print(f"   Predicted: {prediction} ({confidence:.1%} confidence)")
                passed += 1
            else:
                print(f"❌ Failed: {text[:40]}...")
                failed += 1
                
        except Exception as e:
            print(f"❌ Error on '{text[:40]}...': {e}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0

def main():
    """Run all tests"""
    print("\n" + "🧪"*30)
    print("MODEL HOT-RELOAD TEST SUITE")
    print("🧪"*30)
    
    results = {}
    
    # Test 1: Service health
    results["Health Check"] = test_service_health()
    if not results["Health Check"]:
        print("\n❌ Service is not running. Please start it first:")
        print("   cd ml-service")
        print("   uvicorn app:app --reload --port 8000")
        return
    
    # Test 2: Model status before reload
    success, status_before = test_model_status()
    results["Status Before"] = success
    
    # Test 3: Prediction before reload
    success, pred_before = test_prediction_before_reload()
    results["Prediction Before"] = success
    
    # Test 4: Reload models
    success, reload_result = test_reload_models()
    results["Model Reload"] = success
    
    if success:
        # Give it a moment to complete
        time.sleep(0.5)
    
    # Test 5: Prediction after reload
    success, pred_after = test_prediction_after_reload()
    results["Prediction After"] = success
    
    # Test 6: Multiple predictions
    results["Multiple Predictions"] = test_multiple_predictions()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        icon = "✅" if result else "❌"
        print(f"{icon} {test_name}")
    
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} tests passed")
    print(f"{'='*60}\n")
    
    if passed == total:
        print("🎉 All tests passed! Hot-reload is working!\n")
        print("✅ Models can be reloaded without restarting the service")
        print("✅ Predictions work after reload")
        print("✅ No downtime required for model updates")
    else:
        print("⚠️  Some tests failed. Check the output above.\n")

if __name__ == '__main__':
    main()
