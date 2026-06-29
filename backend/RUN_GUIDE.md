# Cara Menjalankan Backend .NET Shago Finote

## 🚀 Quick Start (Recommended)

### Option 1: Docker Compose (Paling Mudah)

```bash
cd backend
docker-compose up -d
```

**Itu saja!** Semua service akan berjalan:
- **API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger
- **PostgreSQL**: localhost:5432
- **PgAdmin**: http://localhost:5050

Untuk stop:
```bash
docker-compose down
```

### Option 2: Local Development (.NET CLI)

**Prerequisites:**
- .NET 8 SDK installed
- PostgreSQL 16 running locally
- Visual Studio Code atau IDE lainnya

**Steps:**
```bash
cd backend/ShagoFinote
dotnet restore
dotnet build
dotnet run
```

API akan jalan di: http://localhost:5000

---

## 📋 Detailed Setup Guide

### Method 1: Docker Compose (Full Stack)

#### 1.1 Prerequisites
- Docker Desktop installed
- WSL 2 (Windows) atau native Docker (Mac/Linux)

#### 1.2 Start Services
```bash
cd backend
docker-compose up -d
```

#### 1.3 Verify Services Running
```bash
docker-compose ps
```

Expected output:
```
NAME                 STATUS
shagofinote-api      Up (healthy)
shagofinote-postgres Up
pgadmin              Up
```

#### 1.4 View Logs
```bash
# All services
docker-compose logs -f

# Only API
docker-compose logs -f api

# Only database
docker-compose logs -f postgres
```

#### 1.5 Stop Services
```bash
docker-compose down
```

Or keep data but stop:
```bash
docker-compose stop
docker-compose start
```

---

### Method 2: Local .NET Development

#### 2.1 Prerequisites
```bash
# Check .NET version
dotnet --version
# Should be 8.0 or higher

# Check PostgreSQL
psql --version
# Should be PostgreSQL 12+
```

#### 2.2 Install Dependencies
```bash
cd backend/ShagoFinote
dotnet restore
```

#### 2.3 Setup Database

**Create PostgreSQL database:**
```bash
psql -U postgres

# In PostgreSQL CLI:
CREATE DATABASE shagofinote;
CREATE USER shagofinote_user WITH PASSWORD 'your_secure_password';
ALTER ROLE shagofinote_user SET client_encoding TO 'utf8';
ALTER ROLE shagofinote_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE shagofinote_user SET default_transaction_deferrable TO on;
ALTER ROLE shagofinote_user SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE shagofinote TO shagofinote_user;
\q
```

#### 2.4 Update Connection String

Edit `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=shagofinote;Username=shagofinote_user;Password=your_secure_password"
  }
}
```

#### 2.5 Run Migrations
```bash
cd ShagoFinote
dotnet ef database update
```

#### 2.6 Run API
```bash
dotnet run
```

API available at: http://localhost:5000

---

### Method 3: Visual Studio (Windows)

#### 3.1 Open Project
1. Open Visual Studio 2022
2. File → Open → Folder
3. Select `/backend/ShagoFinote/`

#### 3.2 Configure Database
1. Modify `appsettings.Development.json` connection string
2. Or use Docker database: keep default connection string

#### 3.3 Run
Press F5 or click "Start Debugging"

---

### Method 4: Visual Studio Code

#### 4.1 Install Extensions
- C# (by Microsoft)
- C# Dev Kit
- REST Client (for testing)

#### 4.2 Open Workspace
```bash
cd backend/ShagoFinote
code .
```

#### 4.3 Run Configuration
Press F5 → Select ".NET: Launch .NET Core"

---

## 🧪 Test API

### 1. Register User

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "fullName": "Test User"
  }'
```

**Using PowerShell:**
```powershell
$body = @{
    email = "user@example.com"
    username = "testuser"
    password = "SecurePass123!"
    fullName = "Test User"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### 2. Login & Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

### 3. Create Transaction

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "type": 2,
    "description": "Lunch at cafe",
    "categoryId": 1,
    "transactionDate": "2024-06-29T12:00:00Z"
  }'
```

### 4. Get All Transactions

```bash
curl -X GET "http://localhost:5000/api/transactions?pageNumber=1&pageSize=10" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 5. Swagger UI

Buka browser: http://localhost:5000/swagger

Klik "Authorize" dan input token Anda

---

## 🛠️ Useful Commands

### Docker Commands
```bash
# View all running containers
docker ps -a

# View container logs
docker logs -f shagofinote-api

# Execute command in container
docker exec -it shagofinote-api bash

# Rebuild image
docker-compose build --no-cache

# Remove everything and start fresh
docker-compose down -v
docker-compose up -d
```

### .NET Commands
```bash
# Build project
dotnet build

# Run tests
dotnet test

# Create migration
dotnet ef migrations add CreateInitialSchema

# Update database
dotnet ef database update

# Check database migrations
dotnet ef migrations list

# Rollback migration
dotnet ef database update <PreviousMigrationName>

# Clean/reset (delete all migrations)
dotnet ef migrations remove --force
```

### PostgreSQL Commands
```bash
# Connect to database
psql -U postgres -d shagofinote

# List databases
\l

# List tables
\dt

# View table structure
\d transactions

# Run query
SELECT * FROM users;

# Exit
\q
```

### Git Commands
```bash
# Commit changes
git add -A
git commit -m "message"

# Push to repository
git push origin main

# View commit history
git log --oneline -10
```

---

## 📊 Database Connection

### Via Docker (Recommended)
```
Host: localhost
Port: 5432
Database: shagofinote
Username: postgres
Password: postgres
```

### Via PgAdmin (Web UI)
1. Open http://localhost:5050
2. Login: admin@shagofinote.app / admin
3. Add server:
   - Host: postgres
   - Port: 5432
   - Database: shagofinote
   - Username: postgres
   - Password: postgres

### Via DBeaver
1. Download DBeaver Community
2. New Database Connection
3. PostgreSQL
4. Connection settings (see above)

---

## ⚠️ Common Issues & Solutions

### Issue: Port 5000 Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port in docker-compose.yml
# Change: "5000:5000" to "5001:5000"
```

### Issue: PostgreSQL Connection Failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d postgres

# Verify connection string in appsettings.json
```

### Issue: Docker Images Not Found
```bash
# Pull latest images
docker-compose pull

# Rebuild images
docker-compose build
```

### Issue: Database Locked
```bash
# Kill all connections to database
psql -U postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'shagofinote' AND pid <> pg_backend_pid();"

# Or in Docker
docker-compose exec postgres psql -U postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'shagofinote' AND pid <> pg_backend_pid();"
```

### Issue: Memory/Performance Issues
```bash
# Check Docker resources
docker stats

# Increase Docker memory (Docker Desktop settings)
# Settings → Resources → Memory: increase to 4GB+
```

### Issue: SSL/Certificate Errors
```bash
# Disable SSL verification (development only)
# In Program.cs, before app.Run():
app.Urls.Add("http://localhost:5000");

# Or set environment variable
export ASPNETCORE_URLS=http://localhost:5000
```

---

## 🔐 Production Deployment

### Prerequisites
- Docker registry (Docker Hub, ACR, ECR)
- Kubernetes cluster or VPS
- PostgreSQL managed service (AWS RDS, Azure Database)

### Build Production Image
```bash
docker build -f ShagoFinote/Dockerfile -t myregistry/shagofinote-api:1.0.0 .
docker push myregistry/shagofinote-api:1.0.0
```

### Deploy to Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Deploy to Docker Host
```bash
docker run -d \
  --name shagofinote-api \
  -p 5000:5000 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e Jwt__Secret="your-production-secret" \
  -e "ConnectionStrings__DefaultConnection=Host=prod-db.example.com;..." \
  myregistry/shagofinote-api:1.0.0
```

---

## 📝 Monitoring & Logs

### View API Logs
```bash
# Docker
docker-compose logs -f api

# Local
tail -f ShagoFinote/logs/api-*.log
```

### Check Health
```bash
curl http://localhost:5000/health
```

### Performance Monitoring
```bash
# Docker stats
docker stats shagofinote-api

# Process monitoring
ps aux | grep dotnet
```

---

## 🎯 Next Steps

1. **Test API**: Open http://localhost:5000/swagger
2. **Register user**: Try registration endpoint
3. **Get token**: Login to get JWT
4. **Create transaction**: Test transaction endpoint
5. **View database**: Open PgAdmin at http://localhost:5050
6. **Check logs**: `docker-compose logs -f api`

---

## 📞 Support

Jika ada masalah:

1. Check logs: `docker-compose logs api`
2. Verify services: `docker-compose ps`
3. Check connections: `docker network ls`
4. Review configuration: `appsettings.json` dan `docker-compose.yml`

Untuk documentation lebih detail, baca:
- `README.md` - API reference
- `SETUP.md` - Setup guide
- `IMPLEMENTATION_COMPLETE.md` - Technical details
