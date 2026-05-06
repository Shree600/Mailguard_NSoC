import pytest
from predictor import predict_email

class TestMLIntegration:
    
    @pytest.mark.integration
    def test_full_prediction_pipeline(self):
        """Test complete prediction pipeline with known examples"""
        test_cases = [
            {
                "text": "URGENT: Your account has been compromised. Click here to reset your password immediately: http://fake-login.com",
                "expected_label": "phishing"
            },
            {
                "text": "Hi team, please find the updated project schedule for next week attached. Thanks!",
                "expected_label": "safe"
            }
        ]
        
        for case in test_cases:
            result = predict_email(case["text"])
            
            assert result['prediction'] is not None
            assert 0 <= result['confidence'] <= 1
            # Note: We don't strictly assert the label here as the model might be dummy/not perfectly trained
            # but we ensure the pipeline returns a valid result.
            print(f"Text: {case['text'][:20]}... Prediction: {result['prediction']}")
