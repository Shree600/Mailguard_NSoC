# Docker Deployment Guide

## Prerequisites

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- Node.js >= 18 (for generating encryption key)
- Clerk account (https://dashboard.clerk.com)
- Google Cloud OAuth credentials (https://console.cloud.google.com)

## Quick Start

### 1. Environment Setup

```bash
# Copy the Docker environment template
cp .env.docker.example .env

# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure Environment Variables

Edit `.env` and set all required values:

**Critical Values (must change):**
- `MONGO_ROOT_PASSWORD` - Strong MongoDB password
- `ENCRYPTION_KEY` - Output from step 1
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `VITE_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

**MongoDB URI:**
Update `MONGO_URI` with your MongoDB password:
```
MONGO_URI=mongodb://admin:YOUR_PASSWORD@mongo:27017/mailguard?authSource=admin
```

### 3. Build and Start Services

```bash
# Build and start all services in detached mode
docker compose up --build -d

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f backend
```

### 4. Verify Deployment

```bash
# Check all services are running
docker compose ps

# Test health endpoints
curl http://localhost:5000/health    # Backend
curl http://localhost:8000/health    # ML Service
curl http://localhost:3000/health    # Frontend

# Check MongoDB connection
docker exec mailguard-mongo mongosh -u admin -p YOUR_PASSWORD --eval "db.adminCommand('ping')"
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: mailguard-network         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │  Frontend   │─────▶│   Backend    │─────▶│  MongoDB   │ │
│  │  (nginx)    │      │  (Node.js)   │      │            │ │
│  │  Port: 3000 │      │  Port: 5000  │      │ Port: 27017│ │
│  └─────────────┘      └──────┬───────┘      └────────────┘ │
│                              │                               │
│                              ▼                               │
│                       ┌──────────────┐                       │
│                       │  ML Service  │                       │
│                       │  (FastAPI)   │                       │
│                       │  Port: 8000  │                       │
│                       └──────────────┘                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Volumes:
  - mailguard-mongo-data    (MongoDB data persistence)
  - mailguard-mongo-config  (MongoDB configuration)
  - mailguard-ml-models     (ML models persistence)
  - mailguard-ml-datasets   (Training datasets persistence)
```

## Container Details

### Frontend (React + Nginx)
- **Port:** 3000:80
- **Technology:** React + Vite + Nginx
- **Health Check:** `/health` endpoint
- **Depends On:** Backend
- **Build Args:** `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`

### Backend (Node.js + Express)
- **Port:** 5000:5000
- **Technology:** Node.js + Express
- **Health Check:** `/health` endpoint
- **Depends On:** MongoDB, ML Service
- **Environment:** Production mode, all secrets via environment variables

### ML Service (FastAPI)
- **Port:** 8000:8000
- **Technology:** Python + FastAPI + scikit-learn
- **Health Check:** Python urllib health check
- **Volumes:** Model and dataset persistence
- **Startup:** 40s start period for model loading

### MongoDB
- **Port:** 27017:27017
- **Image:** mongo:7-jammy
- **Authentication:** Required (set via environment variables)
- **Volumes:** Data and config persistence
- **Health Check:** mongosh ping command

## Common Commands

### Start/Stop
```bash
# Start services (detached)
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v

# Restart specific service
docker compose restart backend
```

### Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f ml-service

# Last 100 lines
docker compose logs --tail=100
```

### Rebuild
```bash
# Rebuild all services
docker compose up --build

# Rebuild specific service
docker compose up --build backend

# Force rebuild without cache
docker compose build --no-cache
```

### Database Management
```bash
# Access MongoDB shell
docker exec -it mailguard-mongo mongosh -u admin -p YOUR_PASSWORD

# Backup database
docker exec mailguard-mongo mongodump --username=admin --password=YOUR_PASSWORD --authenticationDatabase=admin --db=mailguard --out=/backup
docker cp mailguard-mongo:/backup ./mongodb-backup

# Restore database
docker cp ./mongodb-backup mailguard-mongo:/backup
docker exec mailguard-mongo mongorestore --username=admin --password=YOUR_PASSWORD --authenticationDatabase=admin /backup
```

### Service Inspection
```bash
# List all containers
docker compose ps -a

# View resource usage
docker stats

# Inspect service configuration
docker compose config

# Network inspection
docker network inspect mailguard-network
```

## Volume Management

### List Volumes
```bash
docker volume ls | grep mailguard
```

### Inspect Volume
```bash
docker volume inspect mailguard-mongo-data
docker volume inspect mailguard-ml-models
```

### Backup Volumes
```bash
# Backup MongoDB data
docker run --rm -v mailguard-mongo-data:/data -v $(pwd):/backup alpine tar czf /backup/mongo-data-backup.tar.gz -C /data .

# Backup ML models
docker run --rm -v mailguard-ml-models:/data -v $(pwd):/backup alpine tar czf /backup/ml-models-backup.tar.gz -C /data .
```

### Restore Volumes
```bash
# Restore MongoDB data
docker run --rm -v mailguard-mongo-data:/data -v $(pwd):/backup alpine tar xzf /backup/mongo-data-backup.tar.gz -C /data

# Restore ML models
docker run --rm -v mailguard-ml-models:/data -v $(pwd):/backup alpine tar xzf /backup/ml-models-backup.tar.gz -C /data
```

## Troubleshooting

### Services Won't Start

1. **Check if all required environment variables are set:**
   ```bash
   docker compose config
   ```

2. **Check service logs:**
   ```bash
   docker compose logs backend
   docker compose logs ml-service
   ```

3. **Verify MongoDB authentication:**
   ```bash
   docker exec -it mailguard-mongo mongosh -u admin -p YOUR_PASSWORD
   ```

### Backend Can't Connect to MongoDB

**Issue:** `MongoServerError: Authentication failed`

**Solution:**
- Verify `MONGO_URI` has correct username and password
- Ensure `authSource=admin` is in the connection string
- Check `MONGO_ROOT_PASSWORD` matches in both `.env` and `MONGO_URI`

### ML Service Not Responding

**Issue:** Backend shows "ML service unavailable"

**Solution:**
```bash
# Check ML service logs
docker compose logs ml-service

# Verify health endpoint
curl http://localhost:8000/health

# Restart ML service
docker compose restart ml-service
```

### Frontend Can't Connect to Backend

**Issue:** Network errors in browser console

**Solution:**
- Verify `VITE_API_BASE_URL` is set correctly during build
- Check CORS configuration in backend (FRONTEND_URL environment variable)
- Rebuild frontend: `docker compose up --build frontend`

### Container Keeps Restarting

1. **Check health check status:**
   ```bash
   docker compose ps
   ```

2. **View container logs:**
   ```bash
   docker compose logs -f <service-name>
   ```

3. **Disable health check temporarily:**
   Comment out `healthcheck` in docker-compose.yml and rebuild

### Out of Disk Space

**Check volume sizes:**
```bash
docker system df -v
```

**Clean up:**
```bash
# Remove unused containers, networks, images
docker system prune -a

# Remove unused volumes (⚠️ may delete data)
docker volume prune
```

## Production Deployment Checklist

- [ ] Strong `MONGO_ROOT_PASSWORD` set (min 16 characters)
- [ ] Secure `ENCRYPTION_KEY` generated (64 hex characters)
- [ ] Production Clerk credentials configured
- [ ] Google OAuth redirect URI matches production domain
- [ ] `VITE_API_BASE_URL` points to production backend
- [ ] `FRONTEND_URL` set to production frontend URL
- [ ] MongoDB authentication enabled and tested
- [ ] All services use HTTPS in production
- [ ] Firewall configured (expose only 80/443)
- [ ] Volume backups scheduled
- [ ] Log aggregation configured
- [ ] Monitoring/alerting set up
- [ ] SSL/TLS certificates configured (use Let's Encrypt)

## Security Notes

1. **Never commit `.env` file** - It's in `.gitignore` for a reason
2. **Rotate secrets regularly** - Especially `ENCRYPTION_KEY` and database passwords
3. **Use HTTPS in production** - Configure reverse proxy (nginx/Caddy) with SSL
4. **Restrict MongoDB access** - Don't expose port 27017 externally in production
5. **Use strong passwords** - Minimum 16 characters with mixed case, numbers, symbols
6. **Enable Docker secrets** - For production, consider using Docker Swarm secrets
7. **Scan images regularly** - Use `docker scan` or Trivy for vulnerability scanning

## Performance Tuning

### Resource Limits (Production)

Edit `docker-compose.yml` to add resource constraints:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### MongoDB Optimization

```yaml
mongo:
  command: mongod --wiredTigerCacheSizeGB 1.5
```

### Build Cache Optimization

Use BuildKit for faster builds:
```bash
DOCKER_BUILDKIT=1 docker compose build
```

## Support

For issues or questions:
- Check logs: `docker compose logs -f`
- Review [SECURITY.md](SECURITY.md) for security configuration
- Check backend README: [backend/README.md](backend/README.md)
- Check ML service README: [ml-service/README.md](ml-service/README.md)
