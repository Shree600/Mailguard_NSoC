# Mailguard Backend API

## Overview
Backend API for Mailguard - A phishing email detection system built with Node.js, Express, and MongoDB.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or remote connection)
- npm or yarn

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/source-rashi/Mailguard.git
cd Mailguard
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mailguard
JWT_SECRET=supersecretkey
```

4. **Start MongoDB**
Make sure MongoDB is running on your system.

5. **Run the server**
```bash
npm start
```

The server will start on `http://localhost:5000`

## Project Structure
```
backend/
├── config/
│   └── db.js                 # MongoDB connection configuration
├── controllers/
│   └── authController.js     # Authentication logic (register, login)
├── middleware/
│   └── authMiddleware.js     # JWT authentication middleware
├── models/
│   └── User.js               # User schema and model
├── routes/
│   └── authRoutes.js         # Authentication routes
└── server.js                 # Main server file
```

## API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Routes

#### 1. Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

#### 2. Login User
**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

#### 3. Verify Token
**GET** `/api/auth/verify`

Verify JWT token and get user information (Protected Route).

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

## Authentication Flow

1. **Register** or **Login** to receive a JWT token
2. Include the token in the `Authorization` header for protected routes:
   ```
   Authorization: Bearer <your_jwt_token>
   ```
3. The token expires in 30 days
4. After expiration, user must login again

## Database Schema

### User Model
```javascript
{
  name: String,           // Required, trimmed
  email: String,          // Required, unique, lowercase
  passwordHash: String,   // Required, bcrypt hashed
  createdAt: Date,        // Auto-generated
  updatedAt: Date         // Auto-generated
}
```

## Security Features
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT token-based authentication
- ✅ Environment variable protection
- ✅ CORS enabled
- ✅ Input validation
- ✅ Email format validation
- ✅ Unique email constraint

## Testing with curl

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Verify Token
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Testing with Postman

1. **Register User**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/register`
   - Body: JSON (see above)

2. **Login User**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/login`
   - Body: JSON (see above)

3. **Verify Token**
   - Method: GET
   - URL: `http://localhost:5000/api/auth/verify`
   - Headers: `Authorization: Bearer <token>`

## Development Scripts

```bash
# Start server
npm start

# Start with auto-reload (requires nodemon)
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGO_URI | MongoDB connection string | mongodb://127.0.0.1:27017/mailguard |
| JWT_SECRET | Secret key for JWT signing | supersecretkey |

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created (registration successful) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid credentials/token) |
| 404 | Not Found |
| 500 | Internal Server Error |

## Future Enhancements (Phase 2+)
- Email extraction from Gmail
- ML-based phishing detection
- Email classification endpoints
- Dashboard analytics
- Real-time scanning
- Multi-account support

## License
MIT

## Contributors
Mailguard Development Team

---

**Phase 1 Complete! ✅**
Backend foundation with authentication is ready.
