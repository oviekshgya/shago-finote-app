# Quick Run Backend - Pilih Salah Satu

## ⚡ FASTEST WAY (1 Command)

```bash
cd backend && docker-compose up -d
```

Done! Services ready:
- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger
- Database: localhost:5432
- PgAdmin: http://localhost:5050

---

## 🏃 Option 1: Docker (Recommended)

```bash
# Start
cd backend
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

---

## 🖥️ Option 2: Local .NET (If No Docker)

```bash
# Prerequisites: .NET 8 SDK + PostgreSQL installed

cd backend/ShagoFinote
dotnet restore
dotnet build
dotnet run
```

API: http://localhost:5000

---

## 🔧 Option 3: Visual Studio

1. Open Visual Studio 2022
2. File → Open → `/backend/ShagoFinote`
3. F5 (Start Debugging)

---

## ✅ Verify It's Working

```bash
# Option 1: Browser
http://localhost:5000/swagger

# Option 2: cURL
curl http://localhost:5000/health

# Option 3: Check containers
docker-compose ps
```

---

## 📝 First API Call

### Register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "fullName": "Test User"
  }'
```

### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Response: Copy token untuk authorization

### Create Transaction:
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "type": 2,
    "description": "Lunch",
    "categoryId": 1,
    "transactionDate": "2024-06-29T12:00:00Z"
  }'
```

---

## 🛑 Stop Backend

```bash
# Docker
docker-compose down

# .NET (Press Ctrl+C in terminal)
```

---

## 📚 Need More Help?

- **Full Guide**: Read `RUN_GUIDE.md`
- **Setup Details**: Read `SETUP.md`
- **API Docs**: Read `README.md` or visit `/swagger`

---

## ⚙️ Default Credentials

**PostgreSQL:**
- Host: localhost:5432
- Username: postgres
- Password: postgres
- Database: shagofinote

**PgAdmin:**
- URL: http://localhost:5050
- Email: admin@shagofinote.app
- Password: admin

---

## 🚨 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change port in docker-compose.yml |
| Database error | Make sure PostgreSQL running: `docker-compose up -d postgres` |
| Image not found | Pull latest: `docker-compose pull` |
| Permission denied | Run with sudo or add user to docker group |
| Can't connect API | Check if services running: `docker-compose ps` |

---

**Status**: Ready to run! Choose method above and start 🚀
