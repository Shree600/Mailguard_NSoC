# 🛡️ Mailguard

**AI-Powered Phishing Detection & Email Security Platform**

Mailguard is a full-stack application that automatically detects phishing emails using machine learning, integrates with Gmail for real-time scanning, and provides detailed analytics through an intuitive dashboard.

> **🔐 Authentication:** Mailguard uses [Clerk](https://clerk.com) for modern, secure authentication with multi-factor authentication and social login support.

---

## ✨ Features

- 🤖 **AI-Powered Detection**: Random Forest ML model with TF-IDF vectorization for accurate phishing detection
- 📧 **Gmail Integration**: OAuth2 integration for secure email fetching and scanning
- 🎯 **Real-time Classification**: Instant phishing detection with confidence scores
- 🔎 **Prediction Explainability**: Top token-level risk signals for each classification
- 📊 **Analytics Dashboard**: Comprehensive stats, charts, and email management interface
- 🔄 **Auto-Retraining**: Feedback loop with automatic model retraining capability
- 🔐 **Secure Authentication**: Clerk-based auth with MFA and social login support
- 🐳 **Docker Ready**: Complete containerization for easy deployment
- 📱 **Responsive UI**: Modern, mobile-friendly interface built with React and TailwindCSS

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 + Vite
- TailwindCSS + shadcn/ui
- Clerk React SDK
- Recharts for visualizations
- Nginx for production serving

**Backend**
- Node.js + Express
- MongoDB for data persistence
- Clerk SDK for authentication
- Gmail OAuth2 integration
- Redis-based caching

**ML Service**
- Python 3.11 + FastAPI
- scikit-learn (Random Forest)
- TF-IDF vectorization
- Automatic model retraining
- Prediction caching

### Project Structure
```
Mailguard/
├── docker-compose.yml           # Full stack orchestration
├── .env.docker.example          # Environment variables template
├── backend/                     # Node.js API server
│   ├── server.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── Dockerfile
├── frontend/                    # React application
│   ├── src/
│   ├── nginx.conf
│   └── Dockerfile
└── ml-service/                  # Python ML service
    ├── app.py
    ├── predictor.py
    ├── retrain.py
    └── Dockerfile
```

---

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker & Docker Compose
- Clerk account ([sign up free](https://dashboard.clerk.com/sign-up))
- Google Cloud project with Gmail API enabled ([setup guide](https://console.cloud.google.com))

### 1. Clone Repository
```bash
git clone https://github.com/source-rashi/Mailguard.git
cd Mailguard
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.docker.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Edit `.env` File
Update the following required values:
```env
# Clerk (from https://dashboard.clerk.com)
CLERK_SECRET_KEY=sk_test_your_secret_key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Google OAuth (from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/callback

# Security (generated above)
ENCRYPTION_KEY=your_64_character_hex_key

# Database (change in production!)
MONGO_ROOT_PASSWORD=your_secure_password
```

### 4. Launch Stack
```bash
# Build and start all services
docker compose up --build

# Or run in detached mode
docker compose up --build -d
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **ML Service**: http://localhost:8000
- **MongoDB**: mongodb://localhost:27017

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB running locally

### Backend Setup
```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env
# Edit .env with your credentials

# Start backend server
npm start
# Runs on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env file
cat > .env << EOF
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_API_BASE_URL=http://localhost:5000/api
EOF

# Start dev server
npm run dev
# Runs on http://localhost:5173
```

### ML Service Setup
```bash
cd ml-service
pip install -r requirements.txt

# Start ML service
python app.py
# Runs on http://localhost:8000
```

---

## 🔧 Configuration Guide

### Clerk Authentication Setup
1. Create account at [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new application
3. Copy **Publishable Key** and **Secret Key**
4. Add to `.env`:
   - `CLERK_SECRET_KEY` (backend)
   - `VITE_CLERK_PUBLISHABLE_KEY` (frontend)

### Gmail OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Gmail API**
4. Create **OAuth 2.0 Client ID** credentials
5. Add authorized redirect URI: `http://localhost:5000/api/gmail/callback`
6. Copy **Client ID** and **Client Secret** to `.env`

### Encryption Key Generation
Required for encrypting Gmail access tokens:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📖 Usage Guide

### 1. Register/Login
- Create account using email or social login (Google, GitHub, etc.)
- Clerk handles authentication securely

### 2. Connect Gmail
- Click "Connect Gmail" button
- Authorize Mailguard to access your Gmail (read-only)
- Tokens are encrypted and stored securely

### 3. Fetch & Scan Emails
- Select time range (last 7 days default)
- Click "Fetch Emails" to scan your inbox
- AI automatically classifies emails as safe or phishing

### 4. Review Results
- View classification results in dashboard
- See confidence scores for each prediction
- Review top model signals that influenced each prediction
- Filter by classification type (All/Safe/Phishing)

### 5. Provide Feedback
- Click thumbs up/down to correct predictions
- Feedback trains the model to improve accuracy

### 6. Retrain Model (Admin)
- Collect feedback from users
- Click "Retrain Model" to improve detection
- Model automatically updates and reclassifies emails

---

## 🐳 Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
docker compose logs backend  # Specific service

# Stop all services
docker compose down

# Rebuild after code changes
docker compose up --build

# Remove volumes (fresh start)
docker compose down -v

# Check service health
docker compose ps
```

---

## 🔍 API Endpoints

### Health Check
```bash
GET /health
```

### Gmail
```bash
POST /api/gmail/auth/initiate      # Start OAuth flow
GET  /api/gmail/callback           # OAuth callback
POST /api/gmail/fetch              # Fetch emails
```

### Emails
```bash
GET    /api/emails                 # List emails
POST   /api/emails/classify        # Classify emails
DELETE /api/emails/:id             # Delete email
POST   /api/emails/bulk-delete     # Delete multiple
```

### ML Service
```bash
POST /predict                      # Classify email
POST /retrain                      # Retrain model
GET  /health                       # Service health
```

---

## 🛠️ Troubleshooting

### Docker Issues
```bash
# Reset everything
docker compose down -v
docker compose up --build

# Check logs
docker compose logs backend
docker compose logs ml-service
```

### Gmail OAuth Errors
- Verify redirect URI matches exactly in Google Console
- Check CLIENT_ID and CLIENT_SECRET in `.env`
- Ensure Gmail API is enabled in Google Cloud project

### Model Not Loading
- Check if `ml-service/phishing_model.pkl` exists
- Verify volume mount in `docker-compose.yml`
- Rebuild ML service: `docker compose up --build ml-service`

### Port Conflicts
If ports are already in use, modify in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"    # Frontend (default 3000:80)
  - "5001:5000"  # Backend (default 5000:5000)
  - "8001:8000"  # ML Service (default 8000:8000)
```

---

## 📊 Performance & Scaling

- **Caching**: Redis-based caching for predictions and stats
- **Rate Limiting**: Development (1000 req/15min), Production (100 req/15min)
- **Resource Limits**: Configured in docker-compose.yml
- **Health Checks**: All services have automatic health monitoring

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - already in `.gitignore`
2. **Use strong passwords** for MongoDB in production
3. **Enable HTTPS** when deploying to production
4. **Rotate encryption keys** periodically
5. **Review Clerk security settings** in dashboard
6. **Limit Gmail OAuth scopes** to read-only access

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Clerk](https://clerk.com) for authentication
- [scikit-learn](https://scikit-learn.org) for ML capabilities
- [FastAPI](https://fastapi.tiangolo.com) for ML service framework
- [shadcn/ui](https://ui.shadcn.com) for UI components

---

**Built with ❤️ by the Mailguard Team**
