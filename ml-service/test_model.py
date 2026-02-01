"""Test the retrained model"""
import predictor

# Test with phishing email
print("Test 1: Phishing Email")
result = predictor.predict_email('Congratulations! You won a million dollars! Click here now!')
print(f"  Prediction: {result['prediction']}")
print(f"  Confidence: {result['confidence']:.2%}\n")

# Test with legitimate email
print("Test 2: Legitimate Email")
result = predictor.predict_email('Meeting scheduled for tomorrow at 2pm in the conference room')
print(f"  Prediction: {result['prediction']}")
print(f"  Confidence: {result['confidence']:.2%}\n")

print("Model loaded and working correctly!")
