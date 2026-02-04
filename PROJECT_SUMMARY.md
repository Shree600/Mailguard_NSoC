# MAILGUARD - Complete Project Summary

## 📋 Project Overview

**Mailguard** is a full-stack AI-powered email security application that integrates with Gmail to detect and manage phishing emails using machine learning. The system automatically fetches emails, classifies them as phishing or safe, and provides users with tools to manage, delete, and provide feedback on classifications.

### Core Purpose
- Protect users from phishing attacks by automatically scanning Gmail emails
- Use Machine Learning to classify emails as "phishing" or "safe"
- Allow users to delete phishing emails directly from Gmail
- Collect user feedback to improve ML model accuracy
- Provide analytics and statistics on email safety

---

## 🏗️ System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + Vite + TailwindCSS + Clerk Auth                    │
│  Port: 5173                                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Node.js + Express + MongoDB + Gmail API                    │
│  Port: 5000                                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                      ML SERVICE                              │
│  Python + FastAPI + Scikit-Learn                            │
│  Port: 8000                                                  │
└─────────────────────────────────────────────────────────────┘
```

### External Services
- **Clerk**: User authentication and session management
- **Gmail API**: OAuth2, email fetching, and email deletion
- **MongoDB Atlas**: Database hosting (or local MongoDB)

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.5 (Rolldown)
- **Styling**: TailwindCSS 4.1.18
- **Authentication**: Clerk React SDK 5.60.0
- **Routing**: React Router DOM 7.13.0
- **HTTP Client**: Axios 1.13.4
- **Charts**: Recharts 3.7.0

### Backend
- **Runtime**: Node.js
- **Framework**: Express 4.18.2
- **Database**: MongoDB with Mongoose 8.0.0
- **Authentication**: Clerk Node SDK 4.13.23
- **Gmail Integration**: Google APIs 128.0.0
- **Job Scheduling**: Node-cron 3.0.3
- **HTTP Client**: Axios 1.6.0

### ML Service
- **Framework**: FastAPI 0.115.12
- **Server**: Uvicorn 0.34.0
- **ML Library**: Scikit-Learn 1.7.1
- **Data Processing**: Pandas 2.2.3, NumPy 2.2.4
- **Database**: PyMongo 4.12.0

### DevOps
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git
- **Package Managers**: npm (Frontend/Backend), pip (ML Service)

---

## ✨ Features Implemented

### 1. User Authentication
- **Clerk Integration**: Modern authentication with social logins
- **Session Management**: Automatic token refresh and validation
- **User Sync**: Automatic MongoDB user creation from Clerk data
- **Protected Routes**: Middleware-based authentication

### 2. Gmail Integration
- **OAuth2 Flow**: Secure Gmail authorization
- **Email Fetching**: Batch fetch with customizable parameters
  - Custom email count (1-100 or unlimited)
  - Date range filtering
  - Gmail search queries (e.g., "is:unread", "has:attachment")
- **Email Deletion**: Delete from both Gmail and database
- **Status Checking**: Connection status verification

### 3. ML Email Classification
- **Phishing Detection**: TF-IDF + Logistic Regression model
- **Confidence Scores**: Probability estimates for predictions
- **Batch Processing**: Classify multiple emails efficiently
- **Model Persistence**: Save/load trained models
- **Model Reloading**: Hot reload without service restart

### 4. Email Management
- **Pagination**: Page-based navigation (10/25/50/100 per page)
- **Search**: Full-text search across subject, sender, body
- **Filtering**: 
  - By classification (phishing/safe/pending)
  - By date range
  - By sender/subject
- **Sorting**: Customizable sort order
- **Bulk Operations**: Select and delete multiple emails
- **Auto-Clean**: Remove all phishing emails at once

### 5. User Feedback System
- **Feedback Collection**: Users can mark predictions as correct/incorrect
- **Feedback Storage**: Track all user corrections
- **Training Data**: Feedback can be used to retrain models
- **Statistics**: Track model accuracy through feedback

### 6. Analytics & Visualization
- **Dashboard Stats**: Total, phishing, safe email counts
- **Pie Charts**: Visual distribution of email types
- **Storage Tracking**: Calculate space saved from deletions
- **Real-time Updates**: Live statistics refresh

### 7. Migration System
- **User Migration**: Transfer emails between authentication systems
- **Bulk Update**: Update all email ownership at once
- **Status Checking**: Detect when migration is needed

---

## 📁 Project Structure

```
Mailguard/
├── backend/                    # Node.js Express API
│   ├── config/                 # Configuration files
│   │   ├── db.js              # MongoDB connection
│   │   └── googleOAuth.js     # Gmail OAuth setup
│   ├── controllers/            # Business logic
│   │   ├── adminController.js
│   │   ├── emailController.js
│   │   ├── feedbackController.js
│   │   ├── gmailController.js
│   │   └── migrationController.js
│   ├── jobs/                   # Scheduled tasks
│   │   ├── retrainJob.js
│   │   └── scanJob.js
│   ├── middleware/             # Express middleware
│   │   ├── authMiddleware.js
│   │   └── syncUserMiddleware.js
│   ├── models/                 # MongoDB schemas
│   │   ├── Classification.js
│   │   ├── Email.js
│   │   ├── Feedback.js
│   │   └── User.js
│   ├── routes/                 # API routes
│   │   ├── adminRoutes.js
│   │   ├── emailRoutes.js
│   │   ├── feedbackRoutes.js
│   │   ├── gmailRoutes.js
│   │   └── migrationRoutes.js
│   ├── services/               # External service integrations
│   │   ├── gmailService.js
│   │   └── mlService.js
│   ├── server.js              # Main entry point
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                   # React Vite application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── EmailStatsChart.jsx
│   │   │   ├── EmailTable.jsx
│   │   │   └── Logo.jsx
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/          # API client
│   │   │   └── api.js
│   │   ├── App.jsx            # Main app component
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── .env                   # Environment variables
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── ml-service/                 # Python FastAPI ML service
│   ├── app.py                 # FastAPI application
│   ├── predictor.py           # ML prediction logic
│   ├── retrain.py             # Model retraining script
│   ├── dataset_builder.py     # Build training dataset
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── sample_training.csv    # Sample training data
│   └── models/                # Saved ML models
│       ├── vectorizer.pkl
│       └── model.pkl
│
├── docker-compose.yml          # Docker orchestration
├── README.md                   # Project documentation
└── PROJECT_SUMMARY.md          # This file
```

---

## 🗄️ Database Schema

### Collections

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  clerkId: String (unique),     // Clerk user ID
  email: String (unique),       // User email
  name: String,                 // User display name
  gmailAccessToken: String,     // Gmail OAuth token
  gmailRefreshToken: String,    // Gmail refresh token
  gmailConnectedAt: Date,       // When Gmail was connected
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Emails Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  gmailId: String (unique),     // Gmail message ID
  sender: String,               // From address
  subject: String,              // Email subject
  body: String,                 // Plain text body
  htmlBody: String,             // HTML body
  receivedAt: Date,             // When received in Gmail
  fetchedAt: Date,              // When fetched by system
  classification: String,       // Legacy field (deprecated)
  metadata: {
    threadId: String,
    labelIds: [String],
    snippet: String,
    hasAttachments: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. Classifications Collection
```javascript
{
  _id: ObjectId,
  emailId: ObjectId (ref: Email, unique),
  prediction: String,           // "phishing" or "safe"
  confidence: Number,           // 0.0 to 1.0
  probabilities: {
    phishing: Number,
    safe: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. Feedback Collection
```javascript
{
  _id: ObjectId,
  emailId: ObjectId (ref: Email),
  userId: ObjectId (ref: User),
  predictedLabel: String,       // What ML predicted
  correctLabel: String,         // What user says is correct
  notes: String,                // Optional user notes
  usedInTraining: Boolean,      // Has this been used to retrain?
  createdAt: Date,
  updatedAt: Date
}
// Compound unique index on (emailId, userId)
```

---

## 🔌 API Endpoints

### Authentication (Clerk-based)
All endpoints require Bearer token in Authorization header
```
Authorization: Bearer <clerk_jwt_token>
```

### Gmail Endpoints
```
GET    /api/gmail/auth              - Get OAuth URL
GET    /api/gmail/callback          - OAuth callback handler
GET    /api/gmail/status            - Check Gmail connection
POST   /api/gmail/fetch             - Fetch emails from Gmail
  Body: {
    maxResults: Number (1-100),
    dateFrom: String (ISO date),
    dateTo: String (ISO date),
    query: String (Gmail search),
    fetchAll: Boolean
  }
DELETE /api/gmail/disconnect        - Disconnect Gmail
```

### Email Endpoints
```
GET    /api/emails                  - Get emails with pagination/filters
  Query: {
    page: Number,
    limit: Number,
    prediction: String,
    search: String,
    dateFrom: String,
    dateTo: String,
    sortBy: String,
    sortOrder: String
  }
GET    /api/emails/stats            - Get email statistics
POST   /api/emails/classify         - Classify unclassified emails
DELETE /api/emails/:id              - Delete single email
POST   /api/emails/bulk-delete      - Delete multiple emails
  Body: { emailIds: [String] }
POST   /api/emails/clean-phishing   - Delete all phishing emails
```

### Feedback Endpoints
```
POST   /api/feedback                - Submit feedback
  Body: {
    emailId: String,
    correctLabel: String,
    notes: String (optional)
  }
GET    /api/feedback                - Get user's feedback history
GET    /api/feedback/stats          - Get feedback statistics
DELETE /api/feedback/:id            - Delete feedback
```

### Migration Endpoints
```
GET    /api/migration/status        - Check if migration needed
POST   /api/migration/update-emails - Migrate all emails to current user
```

### ML Service Endpoints
```
GET    /health                      - Health check
POST   /predict                     - Classify single email
  Body: { text: String }
POST   /retrain                     - Retrain model with feedback data
POST   /reload                      - Reload models from disk
GET    /model/status                - Get model information
```

---

## 🔧 Configuration & Setup

### Prerequisites
- Node.js 18+
- Python 3.13+
- MongoDB (local or Atlas)
- Gmail API credentials
- Clerk account

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mailguard

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Gmail OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/callback

# ML Service
ML_SERVICE_URL=http://localhost:8000

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_API_URL=http://localhost:5000/api
```

#### ML Service (.env)
```env
MONGODB_URI=mongodb://localhost:27017/mailguard
```

### Installation Steps

1. **Clone Repository**
```bash
git clone https://github.com/source-rashi/Mailguard.git
cd Mailguard
```

2. **Backend Setup**
```bash
cd backend
npm install
# Create .env file with variables above
npm start
```

3. **Frontend Setup**
```bash
cd frontend
npm install
# Create .env file with variables above
npm run dev
```

4. **ML Service Setup**
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

5. **Docker Setup (Alternative)**
```bash
docker-compose up --build
```

---

## 🤖 Machine Learning Details

### Model Architecture
- **Algorithm**: Logistic Regression
- **Vectorization**: TF-IDF (Term Frequency-Inverse Document Frequency)
- **Features**: Email text (subject + body combined)
- **Classes**: Binary (phishing vs safe)

### Training Data Format
```csv
text,label
"Congratulations! You won $1,000,000",phishing
"Meeting tomorrow at 10am in conference room",legitimate
```

### Model Files
- `vectorizer.pkl`: TF-IDF vectorizer
- `model.pkl`: Trained Logistic Regression model

### Model Performance
- Trained on sample phishing dataset
- Confidence scores provided with each prediction
- Retrainable with user feedback data

### Retraining Process
1. Collect feedback from users
2. Export feedback to CSV format
3. Call `/retrain` endpoint with training data
4. Model automatically reloads after training

---

## ⚠️ Known Issues & Problems

### Critical Issues

1. **Gmail API Quota Limits**
   - Gmail API has daily quotas (25,000 units/day for free tier)
   - Fetching 100 emails uses ~100-200 units
   - Large fetches can hit limits quickly
   - **Solution**: Implement rate limiting, batch requests

2. **Token Expiration Handling**
   - Gmail tokens expire after 1 hour
   - Refresh token logic exists but may fail
   - **Solution**: Better error handling and token refresh retry logic

3. **ML Model Accuracy**
   - Current model is basic (Logistic Regression)
   - Trained on limited sample data
   - May have high false positive/negative rates
   - **Solution**: Use larger dataset, try better algorithms (BERT, DistilBERT)

4. **User Migration Logic**
   - Migration needed when switching auth systems
   - Can be confusing for users
   - **Solution**: Automatic migration on first login

### Medium Priority Issues

5. **Email Body Parsing**
   - HTML emails may not parse correctly
   - Special characters can cause issues
   - Attachments not analyzed
   - **Solution**: Better HTML to text conversion, attachment scanning

6. **Performance Issues**
   - Fetching 500+ emails is slow
   - No progress indicators for long operations
   - **Solution**: WebSocket for real-time progress, background jobs

7. **Database Indexing**
   - Some queries may be slow with large datasets
   - **Solution**: Add compound indexes on frequently queried fields

8. **Error Handling**
   - Some errors show generic messages
   - Stack traces exposed in dev mode
   - **Solution**: Better error messages, proper error logging

### Minor Issues

9. **UI/UX Issues**
   - No loading skeletons for some components
   - Pagination can be confusing
   - Date pickers could be more intuitive
   - **Solution**: Add skeleton loaders, improve UX flow

10. **Missing Features**
    - No email preview/detail view
    - Can't view HTML emails properly
    - No attachment support
    - No email export functionality
    - **Solution**: Add these features incrementally

11. **Security Concerns**
    - Gmail tokens stored in MongoDB (should be encrypted)
    - No rate limiting on API endpoints
    - CORS set to allow all origins in dev
    - **Solution**: Encrypt sensitive data, add rate limiting, fix CORS

12. **Testing**
    - No unit tests
    - No integration tests
    - No E2E tests
    - **Solution**: Add Jest/Vitest tests

---

## 🚀 Future Improvements

### High Priority
1. **Better ML Model**
   - Implement transformer-based models (BERT)
   - Train on larger, real-world datasets
   - Add confidence threshold tuning
   - Implement ensemble methods

2. **Real-time Features**
   - WebSocket for live updates
   - Real-time email notifications
   - Live classification progress

3. **Email Preview**
   - Full email detail modal
   - Render HTML emails safely
   - Show attachments
   - Original headers inspection

4. **Security Enhancements**
   - Encrypt tokens at rest
   - Add rate limiting
   - Implement API key authentication
   - Add audit logs

### Medium Priority
5. **Advanced Filtering**
   - Save filter presets
   - Complex query builder
   - Regex search support

6. **Batch Operations**
   - Move to folder/label
   - Mark as read/unread
   - Apply custom labels

7. **Analytics Dashboard**
   - Time-series charts
   - Sender analysis
   - Attack vector identification
   - Export reports

8. **Multi-email Support**
   - Connect multiple Gmail accounts
   - Unified inbox view
   - Account switching

### Low Priority
9. **Mobile App**
   - React Native mobile app
   - Push notifications

10. **Browser Extension**
    - Chrome/Firefox extension
    - Inline Gmail integration

11. **API Documentation**
    - Swagger/OpenAPI docs
    - Postman collection

12. **Admin Panel**
    - User management
    - System monitoring
    - Model management

---

## 📊 Performance Metrics

### Current Limitations
- **Max emails per page**: 100
- **Fetch batch size**: 100 (500 for "Fetch All")
- **Classification batch**: 100 emails at once
- **Database**: No query optimization yet

### Estimated Processing Times
- Fetch 50 emails: ~10-15 seconds
- Classify 50 emails: ~5-10 seconds
- Delete 10 emails: ~5-8 seconds
- Bulk delete 50 emails: ~20-30 seconds

---

## 🧪 Testing Status

### Current State
- ❌ No automated tests
- ✅ Manual testing only
- ❌ No CI/CD pipeline
- ❌ No code coverage

### Recommended Testing Strategy
1. **Unit Tests**: Jest (Backend), Vitest (Frontend)
2. **Integration Tests**: Supertest (API), React Testing Library
3. **E2E Tests**: Playwright or Cypress
4. **ML Tests**: pytest, model accuracy tests

---

## 🔐 Security Considerations

### Implemented
- ✅ Clerk authentication
- ✅ JWT token validation
- ✅ User-specific data access
- ✅ Gmail OAuth2

### Missing
- ❌ Token encryption in database
- ❌ Rate limiting
- ❌ Input sanitization
- ❌ SQL injection protection (N/A for MongoDB, but still...)
- ❌ XSS protection
- ❌ CSRF tokens
- ❌ API key authentication option

---

## 🐛 Debugging Tips

### Common Issues

1. **"ML service not available"**
   - Check if ML service is running on port 8000
   - Verify ML_SERVICE_URL in backend .env

2. **"Gmail not connected"**
   - User needs to authorize Gmail first
   - Check Gmail OAuth credentials
   - Verify redirect URI matches exactly

3. **"Failed to classify emails"**
   - Ensure ML models exist in ml-service/models/
   - Run model training if files missing
   - Check ML service logs

4. **"403 Forbidden on feedback"**
   - Email ownership issue
   - Run migration endpoint
   - Check userId matches email.userId

5. **Database connection fails**
   - Verify MongoDB is running
   - Check MONGODB_URI format
   - Ensure network access (for Atlas)

### Logging
- Backend: Console logs in terminal
- Frontend: Browser console (F12)
- ML Service: Uvicorn logs

---

## 📝 Code Quality

### Current State
- No linting configured (should add ESLint, Prettier)
- No type checking (should add TypeScript)
- Inconsistent naming conventions
- Some files over 500 lines (should refactor)
- Mix of arrow functions and function declarations

### Recommended Improvements
1. Add ESLint + Prettier
2. Convert to TypeScript
3. Add JSDoc comments
4. Split large files into modules
5. Use consistent naming (camelCase, PascalCase)
6. Add pre-commit hooks (Husky)

---

## 🎯 Deployment Checklist

### Pre-deployment
- [ ] Set NODE_ENV=production
- [ ] Use production MongoDB cluster
- [ ] Enable CORS for specific domains only
- [ ] Set secure cookie flags
- [ ] Enable HTTPS
- [ ] Remove console.logs (or use proper logger)
- [ ] Optimize Docker images
- [ ] Set up environment variables properly
- [ ] Configure Clerk production instance
- [ ] Set up Gmail OAuth production credentials

### Hosting Options
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Backend**: Railway, Render, DigitalOcean, AWS EC2
- **ML Service**: AWS Lambda, Google Cloud Run, Railway
- **Database**: MongoDB Atlas
- **Full Stack**: AWS, Google Cloud, Azure with Docker

---

## 📚 Learning Resources

If continuing development, study:
1. **FastAPI**: For improving ML service
2. **React Query**: For better data fetching
3. **Zustand/Redux**: For state management
4. **Transformers**: For better ML models
5. **Gmail API**: Advanced email operations
6. **MongoDB Aggregation**: For complex queries
7. **Docker**: For better containerization
8. **CI/CD**: GitHub Actions, Jenkins
9. **Testing**: Jest, Vitest, Playwright

---

## 💡 Key Takeaways

### What Works Well
✅ Clean separation of concerns (3-tier architecture)
✅ Clerk authentication integration
✅ Gmail API integration
✅ Basic ML classification
✅ User feedback system
✅ Minimalistic UI design
✅ Pagination and filtering
✅ Docker setup for easy deployment

### What Needs Improvement
⚠️ ML model accuracy and sophistication
⚠️ Error handling and user feedback
⚠️ Performance optimization
⚠️ Security hardening
⚠️ Test coverage
⚠️ Documentation
⚠️ Code organization and quality
⚠️ Real-time features

### Overall Assessment
The project has a **solid foundation** with good architecture and core features implemented. However, it's more of a **proof-of-concept** or **MVP** than a production-ready application. With focused improvements on ML accuracy, security, testing, and performance, it could become a robust email security solution.

---

## 📞 Support & Contact

**Repository**: https://github.com/source-rashi/Mailguard
**Issues**: Use GitHub Issues for bug reports
**Current Status**: Development/Prototype phase

---

## 📄 License

Not specified - Add LICENSE file to repository

---

*Last Updated: February 4, 2026*
*Version: 1.0.0*
*Status: Development Phase*
