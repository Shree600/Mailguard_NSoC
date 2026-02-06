# Docker Security and Optimization Guide

## Overview

This guide covers security hardening and performance optimization implemented in the Mailguard Docker infrastructure.

## Security Features

### 1. Non-Root User Execution

All services run as non-root users to minimize security risks from container breakout attacks.

#### Backend (Node.js)
```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs
```

**UID/GID:** 1001:1001  
**User:** nodejs  
**Impact:** Limits damage if container is compromised

#### ML Service (Python)
```dockerfile
# Create non-root user
RUN useradd -m -u 1001 -s /bin/bash appuser
Run chown -R appuser:appuser /app /app/models /app/datasets
USER appuser
```

**UID/GID:** 1001:1001  
**User:** appuser  
**Impact:** Protects host system from privilege escalation

#### Frontend (Nginx)
```
Runs as nginx user (built-in to nginx:alpine image)
```

**User:** nginx (UID 101)  
**Impact:** Nginx automatically drops privileges

#### MongoDB
```
Runs as mongodb user (built-in to mongo:7-jammy image)
```

**User:** mongodb (UID 999)  
**Impact:** Database files owned by non-root user

### 2. Security Options

#### no-new-privileges

Prevents containers from gaining additional privileges via setuid or setgid binaries:

```yaml
security_opt:
  - no-new-privileges:true
```

**Applied to:** All services (mongo, ml-service, backend, frontend)  
**Protection:** Prevents privilege escalation attacks  
**Docker Security Feature:** Linux security feature enforced at kernel level

### 3. Resource Limits

Resource limits prevent DoS attacks and ensure fair resource distribution:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Maximum CPU usage
      memory: 1G        # Maximum memory usage
    reservations:
      cpus: '0.5'      # Guaranteed CPU allocation
      memory: 512M     # Guaranteed memory allocation
```

#### Resource Allocation Table

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| **MongoDB** | 1.0 | 1G | 0.5 | 512M |
| **ML Service** | 1.0 | 1G | 0.5 | 512M |
| **Backend** | 0.5 | 512M | 0.25 | 256M |
| **Frontend** | 0.25 | 128M | 0.1 | 64M |
| **Total** | 2.75 | 2.625G | 1.35 | 1.344G |

**Minimum Host Requirements:**
- CPU: 2 cores (4 recommended)
- RAM: 4GB (8GB recommended for production)

### 4. Network Isolation

Services isolated on private bridge network:

```yaml
networks:
  mailguard-network:
    driver: bridge
    name: mailguard-network
```

**Security Benefits:**
- Services only communicate within mailguard-network
- No direct access from other Docker networks
- Host network isolation (containers use bridge network)
- DNS resolution only for services in same network

**Exposed Ports (Minimal):**
- 5000: Backend API (authenticated)
- 8000: ML Service (internal use only - could be removed)
- 3000: Frontend (public)
- 27017: MongoDB (should NOT be exposed in production)

**Production Recommendation:**
```yaml
# Remove port mapping for ML service (keep internal)
ml-service:
  ports: []  # No external access

# Remove port mapping for MongoDB (use Docker network only)
mongo:
  ports: []  # No external access
```

### 5. Secrets Management

**Current Approach:** Environment variables from `.env` file

**Security Measures:**
- `.env` in `.gitignore` (never committed)
- Strong password requirements enforced
- ENCRYPTION_KEY required in production
- Key format validation (64 hex chars for AES-256)

**Production Recommendation:** Use Docker Secrets (Swarm mode) or external secret managers:

```yaml
# Docker Swarm Secrets
secrets:
  mongo_password:
    external: true
  encryption_key:
    external: true

services:
  backend:
    secrets:
      - encryption_key
    environment:
      - ENCRYPTION_KEY_FILE=/run/secrets/encryption_key
```

**Alternative Secret Managers:**
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

### 6. Image Security

#### Base Images
- **Backend:** node:18-alpine (minimal attack surface)
- **ML Service:** python:3.11-slim (minimal Debian)
- **Frontend:** node:20-alpine (build) + nginx:alpine (runtime)
- **MongoDB:** mongo:7-jammy (official MongoDB image)

**Security Best Practices:**
- Use official images from trusted registries
- Pin specific versions (avoid `latest` tag)
- Regular security updates via rebuild
- Multi-stage builds (frontend already uses this)

#### Vulnerability Scanning

```bash
# Scan images for vulnerabilities
docker scan mailguard-backend:latest
docker scan mailguard-ml:latest
docker scan mailguard-frontend:latest

# Using Trivy (recommended)
trivy image mailguard-backend:latest
trivy image mailguard-ml:latest
trivy image mailguard-frontend:latest
```

**Schedule:** Scan images weekly or before deployment

### 7. Authentication & Authorization

**Implemented:**
- MongoDB authentication required (MONGO_ROOT_PASSWORD)
- Backend JWT authentication via Clerk
- Admin role-based access control (RBAC)
- Input validation (Zod schemas)
- Rate limiting (7 specialized limiters)

**Security Layers:**
```
Frontend → JWT (Clerk) → Backend → MongoDB Auth
                       → ML Service (internal network only)
```

## Optimization Features

### 1. Layer Caching

Dockerfiles optimized for layer caching:

```dockerfile
# Copy package files first (changes rarely)
COPY package*.json ./
RUN npm install --production

# Copy application code last (changes frequently)
COPY . .
```

**Benefits:**
- Faster rebuilds (reuse cached layers)
- Reduced build time (skip unchanged layers)
- Bandwidth savings (don't re-download dependencies)

### 2. Multi-Stage Builds

Frontend uses multi-stage build to minimize image size:

```dockerfile
# Stage 1: Build (node:20-alpine)
FROM node:20-alpine AS builder
COPY . .
RUN npm run build

# Stage 2: Runtime (nginx:alpine)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Size Comparison:**
- Single-stage: ~500MB (includes Node.js, npm, build tools)
- Multi-stage: ~25MB (only nginx + static files)

**Savings:** ~475MB (95% reduction)

### 3. Production Dependency Installation

```dockerfile
# Install only production dependencies
RUN npm install --production

# Python: Use --no-cache-dir
RUN pip install --no-cache-dir -r requirements.txt
```

**Benefits:**
- Smaller images (no dev dependencies)
- Faster builds (less to download/install)
- Reduced attack surface (fewer packages)

### 4. .dockerignore Files

Comprehensive `.dockerignore` files prevent unnecessary file copying:

```plaintext
# Backend .dockerignore
node_modules/
.env
logs/
*.md
.git/
```

**Benefits:**
- Faster builds (less data to copy)
- Smaller build context (faster uploads to Docker daemon)
- Prevent sensitive files from being included

### 5. Health Check Optimization

Health checks configured with optimal parameters:

```yaml
healthcheck:
  interval: 30s       # Check every 30 seconds
  timeout: 10s        # Max 10 seconds per check
  retries: 5          # 5 failures before unhealthy
  start_period: 40s   # Grace period for startup
```

**Trade-offs:**
- Shorter intervals → Faster failure detection, more overhead
- Longer intervals → Lower overhead, slower detection
- Current settings: Balanced for production use

### 6. Startup Order Optimization

Services start in dependency order with health checks:

```
Start Order (with waits):
1. mongo (40s startup, then health check)
2. ml-service (40s startup, then health check)
3. backend (waits for mongo + ml-service healthy, 40s startup)
4. frontend (waits for backend healthy, 10s startup)
```

**Total Cold Start Time:** ~2-3 minutes
**Warm Restart (cached layers):** ~30-60 seconds

### 7. Resource Efficiency

**Memory Optimization:**
- NODE_ENV=production (reduced memory footprint)
- PYTHONDONTWRITEBYTECODE=1 (no .pyc files)
- nginx gzip compression enabled
- API response caching (if needed, add Redis)

**CPU Optimization:**
- Production builds (minified, optimized)
- Efficient algorithms (TF-IDF vectorization)
- Connection pooling (MongoDB, HTTP)

## Security Testing

### 1. Container Escape Test

Verify non-root user prevents container escape:

```bash
# Try to escalate privileges (should fail)
docker exec mailguard-backend whoami
# Output: nodejs (not root)

docker exec mailguard-backend sudo su
# Output: sudo: command not found (good!)

# Try to access host filesystem (should be limited)
docker exec mailguard-backend ls /
# Should only see container filesystem
```

### 2. Resource Limit Test

Verify resource limits are enforced:

```bash
# Check current resource usage
docker stats mailguard-backend

# Try to exceed memory limit (will be killed by OOM killer)
docker exec mailguard-backend node -e "const arr = []; while(true) arr.push(new Array(1000000))"
```

### 3. Network Isolation Test

Verify services can't access unauthorized networks:

```bash
# Try to access external network from isolated container
docker run --network mailguard-network alpine ping -c 1 google.com
# Should work (internet access allowed)

# Try to access another Docker network
docker network create test-network
docker run --network test-network alpine ping -c 1 mailguard-backend
# Should fail (network isolation working)
```

### 4. Secret Exposure Test

Verify secrets are not exposed:

```bash
# Check container environment (should NOT show secrets in plaintext)
docker inspect mailguard-backend --format='{{json .Config.Env}}'

# Check logs for accidentally logged secrets
docker logs mailguard-backend 2>&1 | grep -i "password\|secret\|token"
# Should not show any secret values
```

## Performance Benchmarking

### 1. Build Time Optimization

```bash
# Measure build time with cache
time docker compose build

# Measure build time without cache
time docker compose build --no-cache

# Expected results:
# With cache: ~30-60 seconds
# Without cache: ~5-10 minutes
```

### 2. Startup Time

```bash
# Measure startup time
time docker compose up -d

# Check when services become healthy
docker compose ps

# Expected healthy time:
# - Frontend: ~10 seconds
# - Backend: ~45 seconds
# - ML Service: ~45 seconds
# - MongoDB: ~45 seconds
```

### 3. Resource Usage Monitoring

```bash
# Monitor real-time resource usage
docker stats

# Generate resource report
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Production Deployment Checklist

### Pre-Deployment Security

- [ ] Run vulnerability scan on all images
- [ ] Review and rotate all secrets
- [ ] Verify ENCRYPTION_KEY is 64 hex chars (32 bytes)
- [ ] Set strong MONGO_ROOT_PASSWORD (min 16 chars)
- [ ] Configure firewall (only ports 80/443 exposed)
- [ ] Disable MongoDB port 27017 external access
- [ ] Configure HTTPS/TLS (reverse proxy with Let's Encrypt)
- [ ] Enable Docker Content Trust (image signing)
- [ ] Review security_opt settings
- [ ] Test non-root user execution
- [ ] Verify resource limits are appropriate

### Pre-Deployment Optimization

- [ ] Build images with --no-cache for clean build
- [ ] Test cold start time (should be < 5 minutes)
- [ ] Verify layer caching works
- [ ] Check image sizes (should be minimal)
- [ ] Test health checks respond correctly
- [ ] Configure log rotation (prevent disk fill)
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure backup automation
- [ ] Test resource limits don't kill services
- [ ] Verify startup order and dependencies

### Post-Deployment Monitoring

- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Check container health status
- [ ] Review logs for errors
- [ ] Test failover and restart behavior
- [ ] Verify backups are working
- [ ] Check for security updates (weekly)
- [ ] Monitor network traffic
- [ ] Audit access logs

## Hardening Recommendations

### Additional Security Measures

1. **AppArmor/SELinux Profiles**
   ```yaml
   security_opt:
     - apparmor=docker-default
     - seccomp=unconfined  # Or custom seccomp profile
   ```

2. **Read-Only Root Filesystem**
   ```yaml
   read_only: true
   tmpfs:
     - /tmp
     - /var/tmp
   ```

3. **Drop Capabilities**
   ```yaml
   cap_drop:
     - ALL
   cap_add:
     - NET_BIND_SERVICE  # Only if needed
   ```

4. **PID Limit**
   ```yaml
   pids_limit: 100
   ```

5. **Logging Driver**
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

### Performance Tuning

1. **Database Optimization**
   ```yaml
   command: mongod --wiredTigerCacheSizeGB 1.5
   ```

2. **Node.js Optimization**
   ```yaml
   environment:
     - NODE_OPTIONS=--max-old-space-size=256
   ```

3. **Python Optimization**
   ```yaml
   environment:
     - PYTHONOPTIMIZE=1
   ```

4. **Nginx Optimization**
   ```nginx
   worker_processes auto;
   worker_rlimit_nofile 65535;
   ```

## Troubleshooting

### High Memory Usage

```bash
# Check which container is using memory
docker stats --no-stream

# Adjust resource limits if legitimate
deploy:
  resources:
    limits:
      memory: 2G  # Increase if needed
```

### Container Killed by OOM

```bash
# Check Docker logs
docker logs mailguard-backend | grep -i "killed\|oom"

# Increase memory limit or optimize application
```

### Build
 Takes Too Long

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker compose build

# Check .dockerignore excludes unnecessary files
cat backend/.dockerignore
```

### Permission Denied Errors

```bash
# Check user ownership in container
docker exec mailguard-backend ls -la /app

# Fix permissions if needed
docker exec --user root mailguard-backend chown-R nodejs:nodejs /app
```

## Monitoring and Alerts

### Prometheus Exporter (Optional)

```yaml
# Add cAdvisor for container metrics
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
  ports:
    - "8080:8080"
```

### Health Check Monitoring

```bash
# Create monitoring script
#!/bin/bash
while true; do
  docker compose ps | grep -v "healthy" && echo "⚠️  Unhealthy containers detected!"
  sleep 60
done
```

## References

- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Resource Constraints](https://docs.docker.com/config/containers/resource_constraints/)
- [Docker Security Scanning](https://docs.docker.com/engine/scan/)

## Summary

✅ **Security Hardened:**
- Non-root users for all services
- no-new-privileges security option
- Network isolation via private bridge
- Resource limits prevent DoS
- Secrets management best practices
- Authentication required (MongoDB, Clerk JWT)

✅ **Performance Optimized:**
- Layer caching for fast rebuilds
- Multi-stage builds (frontend)
- Production-only dependencies
- Comprehensive .dockerignore files
- Efficient health checks
- Optimized startup order

✅ **Production Ready:**
- Vulnerability scanning procedures
- Monitoring and alerting setup
- Backup and disaster recovery
- Security testing procedures
- Performance benchmarking
- Comprehensive documentation
