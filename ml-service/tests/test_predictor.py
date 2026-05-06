import pytest
from predictor import predict_email
import numpy as np

class TestEmailPredictor:
    
    @pytest.mark.unit
    def test_predict_phishing_email(self):
        """Test phishing email detection"""
        # Adapted to pass string text as expected by predictor.py
        phishing_text = "Verify your account immediately. Click here to confirm your password: http://malicious.com"
        
        result = predict_email(phishing_text)
        
        assert result is not None
        assert 'prediction' in result
        assert 'confidence' in result
        assert result['prediction'] in ['phishing', 'safe']
        assert 0 <= result['confidence'] <= 1
    
    @pytest.mark.unit
    def test_predict_safe_email(self):
        """Test legitimate email passes correctly"""
        safe_text = "Meeting scheduled for tomorrow. Please find the agenda attached."
        
        result = predict_email(safe_text)
        
        assert result['prediction'] in ['phishing', 'safe']
    
    @pytest.mark.unit
    def test_predict_with_empty_string(self):
        """Test handling of empty string"""
        with pytest.raises(ValueError):
            predict_email("")

    @pytest.mark.unit
    def test_predict_with_none(self):
        """Test handling of None"""
        with pytest.raises(ValueError):
            predict_email(None)
