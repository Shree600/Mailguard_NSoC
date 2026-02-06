# ================================================
# PHASE 6 - DOCKER SMOKE TEST INSTRUCTIONS
# ================================================
# Run these commands after starting Docker Desktop
# ================================================

# ================================================
# STEP 1: Clean any existing containers/volumes
# ================================================
docker compose down -v
# This removes old containers and volumes for clean test

# ================================================
# STEP 2: Build and start all services
# ================================================
docker compose up --build
# Expected output:
# - Building frontend... done
# - Building backend... done
# - Building ml-service... done
# - Creating mailguard-mongo... done
# - Creating mailguard-ml... done
# - Creating mailguard-backend... done
# - Creating mailguard-frontend... done

# ================================================
# STEP 3: Monitor service health (in new terminal)
# ================================================
docker compose ps
# Expected: All services showing "healthy" status

# Check specific service logs if needed:
docker compose logs mongo
docker compose logs ml-service
docker compose logs backend
docker compose logs frontend

# ================================================
# STEP 4: Verify service connectivity
# ================================================

# Test MongoDB (should connect)
docker exec mailguard-backend node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI).then(() => {console.log('✅ MongoDB connected'); process.exit(0)}).catch(err => {console.error('❌ MongoDB failed:', err.message); process.exit(1)})"

# Test ML Service (should respond)
docker exec mailguard-backend node -e "const http = require('http'); http.get('http://ml-service:8000/health', res => {console.log('✅ ML Service:', res.statusCode === 200 ? 'healthy' : 'unhealthy'); process.exit(0)})"

# ================================================
# STEP 5: Access services from host
# ================================================

# Frontend (browser)
# http://localhost:3000

# Backend API health check
curl http://localhost:5000/health
# Expected: {"status":"healthy","timestamp":"..."}

# ML Service health check
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

# ================================================
# STEP 6: Basic functionality test
# ================================================

# Frontend loads
# - Navigate to http://localhost:3000
# - Should see Mailguard login page
# - No console errors

# Login (requires valid Clerk credentials)
# - Enter email/password
# - Should redirect to dashboard
# - "Connect Gmail" button visible

# ================================================
# STEP 7: Stop services when done
# ================================================
docker compose down
# Stops and removes containers (preserves volumes)

# Clean everything including volumes
docker compose down -v

# ================================================
# EXPECTED RESULTS
# ================================================
# 
# ✅ All 4 services build successfully
# ✅ All services start without errors
# ✅ All health checks pass within 60 seconds
# ✅ Backend connects to MongoDB (mongo:27017)
# ✅ Backend connects to ML service (ml-service:8000)
# ✅ Frontend accessible at localhost:3000
# ✅ Backend API accessible at localhost:5000
# ✅ ML service accessible at localhost:8000
# ✅ No crashes or restart loops
# ✅ Logs show successful connections
#
# ================================================
# TROUBLESHOOTING
# ================================================
#
# If mongo fails to start:
# - Check: docker compose logs mongo
# - Fix: docker compose down -v (clean volumes)
#
# If backend fails to connect to mongo:
# - Check: backend/.env has MONGO_URI=mongodb://mongo:27017/mailguard
# - Check: docker compose logs backend
#
# If backend fails to connect to ML service:
# - Check: backend/.env has ML_SERVICE_URL=http://ml-service:8000
# - Check: docker compose logs ml-service
#
# If frontend build fails:
# - Check: Build args in docker-compose.yml
# - Check: VITE_CLERK_PUBLISHABLE_KEY is set
#
# ================================================
