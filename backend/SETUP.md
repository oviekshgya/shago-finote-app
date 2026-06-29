# Shago Finote Backend - Setup Guide

Quick setup guide untuk Shago Finote .NET Backend API.

## 1. Prerequisites

Pastikan sudah terinstall:
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Recommended)
- OR [.NET 8.0 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
- OR [PostgreSQL 16](https://www.postgresql.org/download/)

## 2. Quick Start with Docker (Recommended)

```bash
# Masuk ke folder backend
cd backend

# Start semua services (API, PostgreSQL, PgAdmin)
docker-compose up -d

# Check status
docker-compose ps
```

**Service URLs:**
- API: http://localhost:5000
- Swagger UI: http://localhost:5000/swagger
- PgAdmin: http://localhost:5050 (admin@shagofinote.app / admin)

**Database Connection (dari PgAdmin):**
- Host: postgres
- Port: 5432
- Database: shagofinote
- Username: postgres
- Password: postgres

## 3. Quick Start without Docker

### Step 1: Setup PostgreSQL

```bash
# macOS dengan Homebrew
brew install postgresql

# Start PostgreSQL
brew services start postgresql

# Create database
createdb shagofinote

# Create user
psql postgres -c "CREATE USER postgres WITH PASSWORD 'postgres';"
```

### Step 2: Update appsettings

Edit `ShagoFinote/appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=shagofinote;Username=postgres;Password=postgres"
  }
}
```

### Step 3: Run Application

```bash
# Restore dependencies
dotnet restore ShagoFinote/ShagoFinote.Api.csproj

# Update database
dotnet ef database update -p ShagoFinote/ShagoFinote.Api.csproj

# Run API
dotnet run --project ShagoFinote/ShagoFinote.Api.csproj
```

**API Available at:** http://localhost:5000

## 4. Testing the API

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123456",
    "fullName": "Test User",
    "phoneNumber": "+6281234567890",
    "currencyCode": "IDR"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64_encoded_refresh_token",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "username": "testuser",
    "fullName": "Test User",
    "currencyCode": "IDR",
    "createdAt": "2024-06-29T12:00:00Z"
  },
  "expiresAt": "2024-06-29T13:00:00Z"
}
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'
```

### Create Transaction

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150000,
    "type": 1,
    "description": "Lunch",
    "merchant": "Resto ABC",
    "transactionDate": "2024-06-29T12:00:00Z"
  }'
```

## 5. Environment Variables

### Development
```bash
ASPNETCORE_ENVIRONMENT=Development
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=shagofinote;Username=postgres;Password=postgres
Jwt__Secret=dev-secret-key-for-development-only
```

### Production
```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Host=prod-db;Port=5432;Database=shagofinote;Username=produser;Password=prodpassword
Jwt__Secret=production-secret-key-change-this-to-something-secure
```

**IMPORTANT:** Selalu gunakan secret key yang aman untuk production!

## 6. Database Migrations

### Create Migration

```bash
dotnet ef migrations add AddNewTable \
  -p ShagoFinote/ShagoFinote.Api.csproj \
  -o Infrastructure/Data/Migrations
```

### Apply Migration

```bash
dotnet ef database update \
  -p ShagoFinote/ShagoFinote.Api.csproj
```

### Remove Last Migration

```bash
dotnet ef migrations remove \
  -p ShagoFinote/ShagoFinote.Api.csproj
```

## 7. API Documentation

Buka Swagger UI di: **http://localhost:5000/swagger**

Swagger akan menampilkan:
- Semua endpoint
- Request/response schema
- Authorization setup
- Try-it-out functionality

## 8. Common Tasks

### View Database in PgAdmin

1. Open http://localhost:5050
2. Login dengan: admin@shagofinote.app / admin
3. Add Server:
   - Host: postgres
   - Port: 5432
   - Username: postgres
   - Password: postgres
4. Browse tables

### View Logs

```bash
# Docker
docker-compose logs -f api

# Local
# Logs di: ShagoFinote/logs/log-YYYY-MM-DD.txt
tail -f ShagoFinote/logs/log-*.txt
```

### Restart Services

```bash
# Docker
docker-compose restart

# Specific service
docker-compose restart api
```

### Stop Services

```bash
docker-compose down

# With volume cleanup
docker-compose down -v
```

## 9. Troubleshooting

### Error: Port 5000 already in use

```bash
# macOS/Linux - Find process
lsof -i :5000
kill -9 <PID>

# Docker - Change port in docker-compose.yml
# Change: "5000:5000" to "5001:5000"
```

### Error: Connection refused to PostgreSQL

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres
```

### Error: Database does not exist

```bash
# Run migrations
dotnet ef database update -p ShagoFinote/ShagoFinote.Api.csproj

# Or in Docker
docker-compose exec api dotnet ef database update
```

### Error: Invalid JWT token

```bash
# Generate new token via /auth/login
# Check token expiry (1 hour)
# Check secret key matches in appsettings
```

## 10. Next Steps

1. **Explore API** - Gunakan Swagger untuk test endpoints
2. **Read Code** - Pahami structure di Domain, Application, Infrastructure
3. **Create Migrations** - Tambah schema baru sesuai kebutuhan
4. **Add Validators** - Implement FluentValidation untuk input validation
5. **Add Tests** - Buat unit tests untuk services

## 11. Production Deployment

### Before Deploy to Production

- [ ] Change `Jwt__Secret` ke nilai yang aman dan random
- [ ] Update database connection string ke production database
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Enable HTTPS
- [ ] Configure proper CORS for frontend domain
- [ ] Setup monitoring dan logging
- [ ] Setup database backups
- [ ] Test API thoroughly
- [ ] Setup CI/CD pipeline (GitHub Actions sudah ready)

### Deploy dengan Docker

```bash
# Build image
docker build -f ShagoFinote/Dockerfile -t shagofinote-api:1.0.0 .

# Push ke registry (ghcr.io, Docker Hub, etc)
docker push shagofinote-api:1.0.0

# Deploy ke server
docker run -d \
  -p 5000:5000 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__DefaultConnection="..." \
  -e Jwt__Secret="..." \
  --name shagofinote-api \
  shagofinote-api:1.0.0
```

## 12. Support & Documentation

- **API Docs**: http://localhost:5000/swagger
- **Backend README**: See README.md
- **Frontend Integration**: See mobile app documentation

---

**Quick Reference Commands**

```bash
# Docker commands
docker-compose up -d              # Start
docker-compose down               # Stop
docker-compose logs -f api        # View logs
docker-compose ps                 # Status

# .NET commands
dotnet build                       # Compile
dotnet run                        # Run
dotnet test                       # Test
dotnet ef migrations add <name>   # Create migration
dotnet ef database update         # Apply migrations

# API testing
curl -X GET http://localhost:5000/api/transactions \
  -H "Authorization: Bearer TOKEN"
```

**Last Updated**: June 29, 2024
