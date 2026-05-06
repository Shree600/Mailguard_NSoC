import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

class TestHealthEndpoint:
    
    @pytest.mark.unit
    def test_health_check_returns_200(self):
        """Test health endpoint is accessible"""
        response = client.get("/health")
        
        assert response.status_code == 200
        assert "status" in response.json()
    
    @pytest.mark.unit
    def test_health_check_response_format(self):
        """Test health endpoint response format"""
        response = client.get("/health")
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"

class TestPredictEndpoint:
    
    @pytest.mark.unit
    def test_predict_email_basic(self):
        """Test email prediction endpoint"""
        # Adapted to use "text" field as expected by app.py
        payload = {
            "text": "This is a test email body for prediction."
        }
        
        response = client.post("/predict", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "prediction" in data
        assert "confidence" in data
    
    @pytest.mark.unit
    def test_predict_email_validation(self):
        """Test endpoint validation for empty payload"""
        response = client.post("/predict", json={})
        
        assert response.status_code == 422  # Pydantic validation error

class TestBatchPredictEndpoint:
    
    @pytest.mark.unit
    def test_batch_predict_multiple_emails(self):
        """Test batch prediction endpoint"""
        # Adapted to use "texts" field as expected by app.py (/predict/batch)
        payload = {
            "texts": [
                "Test email body 1",
                "Test email body 2"
            ]
        }
        
        response = client.post("/predict/batch", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 2
