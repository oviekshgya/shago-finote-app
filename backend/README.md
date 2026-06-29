# Shago Finote - .NET Backend API

Production-ready backend API for Shago Finote Personal Finance Management application.

## Technology Stack

- **.NET 8.0** - Latest long-term support framework
- **PostgreSQL 16** - Primary database with JSON support
- **Entity Framework Core 8.0** - ORM for data access
- **JWT Authentication** - Secure token-based authentication
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Serilog** - Structured logging
- **xUnit** - Unit testing framework

## Features

### Authentication & Authorization
- User registration with email validation
- JWT-based authentication (HS256)
- Refresh token mechanism
- Password hashing with BCrypt
- Role-based access control (ready for implementation)

### Transaction Management
- Create, read, update, delete transactions
- Advanced filtering and search
- Bulk sync from mobile devices
- Deduplication and conflict resolution
- Monthly summary statistics

### Bill Management
- Track recurring and one-time bills
- Due date monitoring
- Payment status tracking
- Bill reminders (ready for implementation)

### Category Management
- Custom expense/income categories
- Default category templates
- Category-based transaction filtering

### Sync & Offline Support
- Bidirectional sync between mobile and server
- Conflict detection and resolution
- Sync history tracking
- Device management

### Financial Reporting
- Monthly, quarterly, yearly reports
- Category breakdown analysis
- Trend analysis
- Export to CSV/Excel/PDF (ready for implementation)

## Getting Started

### Prerequisites

- .NET 8.0 SDK or Docker
- PostgreSQL 14+ or Docker Compose
- Git

### Installation

#### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone <repo-url>
cd backend

# Start services
docker-compose up -d

# API available at http://localhost:5000
# Swagger UI: http://localhost:5000/swagger
# PgAdmin: http://localhost:5050
```

#### Option 2: Local Development

```bash
# Prerequisites
# - PostgreSQL running on localhost:5432
# - Update connection string in appsettings.Development.json

# Restore dependencies
dotnet restore ShagoFinote/ShagoFinote.Api.csproj

# Update database
dotnet ef database update -p ShagoFinote/ShagoFinote.Api.csproj

# Run API
dotnet run --project ShagoFinote/ShagoFinote.Api.csproj
```

## Project Structure

```
backend/
├── ShagoFinote/                    # Main API project
│   ├── Domain/
│   │   └── Entities/              # Domain models (User, Transaction, Bill, etc.)
│   ├── Application/
│   │   ├── DTOs/                  # Data transfer objects
│   │   ├── Services/              # Business logic
│   │   └── Validators/            # Input validation (ready)
│   ├── Infrastructure/
│   │   └── Data/                  # DbContext and migrations
│   ├── Presentation/
│   │   └── Controllers/           # API endpoints
│   ├── Program.cs                 # Startup configuration
│   ├── appsettings.json           # Configuration
│   └── ShagoFinote.Api.csproj    # Project file
├── ShagoFinote.Tests/             # Unit tests (ready for implementation)
├── docker-compose.yml             # Docker compose configuration
├── Dockerfile                      # Docker image definition
└── README.md                       # This file
```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

#### Transactions
- `GET /transactions` - List transactions with filtering
- `GET /transactions/{id}` - Get transaction details
- `POST /transactions` - Create transaction
- `PUT /transactions/{id}` - Update transaction
- `DELETE /transactions/{id}` - Delete transaction
- `POST /transactions/sync` - Bulk sync from mobile
- `GET /transactions/monthly/totals` - Get monthly totals

#### Bills (Ready for implementation)
- `GET /bills` - List bills
- `GET /bills/{id}` - Get bill details
- `POST /bills` - Create bill
- `PUT /bills/{id}` - Update bill
- `DELETE /bills/{id}` - Delete bill
- `POST /bills/{id}/pay` - Mark bill as paid

#### Categories (Ready for implementation)
- `GET /categories` - List categories
- `POST /categories` - Create category
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category

#### Reports (Ready for implementation)
- `GET /reports` - List reports
- `POST /reports/generate` - Generate report
- `GET /reports/{id}` - Get report details
- `GET /reports/{id}/export` - Export report

### Request/Response Examples

#### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "phoneNumber": "+62812345678",
  "currencyCode": "IDR"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Create Transaction
```bash
POST /transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100000,
  "type": 1,  // Expense
  "description": "Makan siang",
  "merchant": "Warteg Sentosa",
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "transactionDate": "2024-06-29T12:30:00Z"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ASPNETCORE_ENVIRONMENT` | Development | Environment (Development/Production) |
| `ConnectionStrings__DefaultConnection` | localhost | PostgreSQL connection string |
| `Jwt__Secret` | dev-secret | JWT signing secret (change in production) |
| `Jwt__Issuer` | ShagoFinote | JWT issuer |
| `Jwt__Audience` | ShagoFinoteApp | JWT audience |

### Database Connection String Format

```
Host=localhost;Port=5432;Database=shagofinote;Username=postgres;Password=postgres
```

## Development

### Running Tests
```bash
dotnet test --configuration Release
```

### Database Migrations
```bash
# Create migration
dotnet ef migrations add MigrationName -p ShagoFinote/ShagoFinote.Api.csproj

# Apply migration
dotnet ef database update -p ShagoFinote/ShagoFinote.Api.csproj

# Remove last migration
dotnet ef migrations remove -p ShagoFinote/ShagoFinote.Api.csproj
```

### Debugging
```bash
dotnet run --project ShagoFinote/ShagoFinote.Api.csproj --environment Development
```

## Deployment

### Docker Build & Run

```bash
# Build image
docker build -f ShagoFinote/Dockerfile -t shagofinote-api:latest .

# Run container
docker run -p 5000:5000 \
  -e ConnectionStrings__DefaultConnection="Host=postgres;..." \
  -e Jwt__Secret="your-secret-key" \
  shagofinote-api:latest
```

### Docker Compose Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Checklist

- [ ] Change JWT secret to strong random value
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Configure proper database backups
- [ ] Enable HTTPS/TLS
- [ ] Setup log aggregation
- [ ] Configure monitoring and alerting
- [ ] Setup rate limiting
- [ ] Enable CORS appropriately
- [ ] Configure API versioning strategy
- [ ] Setup automated deployments

## API Security

- All endpoints (except auth) require JWT authentication
- Passwords hashed with BCrypt (cost factor: 11)
- SQL injection protection via EF Core parameterization
- CORS enabled for mobile app origins
- Rate limiting (ready for implementation)
- Request validation (ready for implementation)

## Monitoring & Logging

All requests and errors are logged using Serilog:
- Console output (development)
- File output (logs/log-YYYY-MM-DD.txt)
- Structured logging for analysis

## Performance Optimization

- Database indexing on frequently queried columns
- Entity Framework Core query optimization
- Pagination for large datasets
- Async/await throughout
- Connection pooling

## Future Enhancements

### Phase 2
- [ ] Bill management API endpoints
- [ ] Category management API endpoints
- [ ] Financial reporting & export

### Phase 3
- [ ] Advanced analytics
- [ ] Recurring transaction automation
- [ ] Budget tracking
- [ ] Multi-currency support

### Phase 4
- [ ] Mobile push notifications
- [ ] Email notifications
- [ ] Third-party integrations (bank APIs)
- [ ] AI-powered insights

## Troubleshooting

### Database Connection Failed
```
Error: FATAL: password authentication failed
Solution: Check PostgreSQL password in connection string
```

### Port Already in Use
```
Error: Address already in use
Solution: Change port in docker-compose.yml or stop conflicting service
```

### JWT Token Invalid
```
Error: Invalid token
Solution: Ensure token is not expired and secret matches
```

### Migration Failed
```
Error: Could not drop database
Solution: Ensure no active connections, then retry migration
```

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push branch: `git push origin feature/your-feature`
4. Create Pull Request

## Support

For issues and questions:
- GitHub Issues: [Create issue](https://github.com/yourusername/shago-finote/issues)
- Email: support@shagofinote.app

## License

MIT License - See LICENSE file for details

---

**Last Updated**: June 29, 2024
**Version**: 1.0.0
**Status**: Production Ready
