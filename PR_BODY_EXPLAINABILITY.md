## Overview
This PR introduces explainability into the phishing detection pipeline so users can understand why an email is flagged.

## Key Features
- ML service now includes top token-level signals in prediction responses.
- Backend persists explanation signals with each classification.
- Email API returns explanation fields for dashboard rendering.
- Dashboard email rows show top signal tokens next to confidence.

## Why This Matters
- Improves user trust in AI predictions.
- Makes security decisions more actionable.
- Aligns with Explainable AI best practices.

## Tech Changes
- FastAPI response model updated to include explanation payload.
- Predictor adds lightweight feature-level explanation generation.
- Node.js ML service adapter propagates explanation fields.
- MongoDB classification schema extended with explanation metadata.
- Email classification controller saves and serves explanation fields.
- React dashboard table renders top signals for each classified email.

## Example Output
Phishing email flagged due to signals such as:
- urgent
- click
- verify

## Testing
- Python syntax checks passed for updated ML files.
- Node syntax checks passed for updated backend files.
- Frontend lint passed after dependency installation.

## Result
Users no longer see only a phishing/safe label; they now see top model signals that explain each classification.

## Screenshot
Add dashboard screenshot showing the Signals text in email rows.
