"""CORS configuration for ML service"""
import os
from typing import List


def get_allowed_origins() -> List[str]:
    """
    Get allowed CORS origins from environment variables.
    
    Env vars:
    - CORS_ORIGINS: Comma-separated list (e.g., "http://localhost:3000,https://app.example.com")
    - NODE_ENV: Environment type (development/production)
    
    Returns:
        List of allowed origin URLs
        
    Raises:
        ValueError: If invalid patterns (like wildcards) are detected
    """
    node_env = os.getenv("NODE_ENV", "development")
    
    # Default origins for development
    if node_env == "development":
        default_origins = [
            "http://localhost:3000",
            "http://localhost:5000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5000",
        ]
    else:
        default_origins = []
    
    # Get custom origins from environment
    custom_origins_env = os.getenv("CORS_ORIGINS", "")
    
    if custom_origins_env:
        custom_origins = [o.strip() for o in custom_origins_env.split(",") if o.strip()]
        
        # Validate origins - reject wildcards and invalid patterns
        for origin in custom_origins:
            if "*" in origin:
                raise ValueError(
                    f"Invalid CORS origin '{origin}': wildcard '*' not allowed. "
                    f"Use explicit origins like 'https://app.example.com'"
                )
            if not origin.startswith(("http://", "https://")):
                raise ValueError(
                    f"Invalid CORS origin '{origin}': must start with http:// or https://"
                )
        
        default_origins.extend(custom_origins)
    
    # In production, require explicit origins
    if node_env == "production" and not default_origins:
        raise ValueError(
            "CORS_ORIGINS environment variable must be set in production. "
            "Example: CORS_ORIGINS='https://app.example.com'"
        )
    
    return list(set(default_origins))  # Remove duplicates
