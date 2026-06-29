FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# Copy project file
COPY ["ShagoFinote/ShagoFinote.Api.csproj", "ShagoFinote/"]

# Restore dependencies
RUN dotnet restore "ShagoFinote/ShagoFinote.Api.csproj"

# Copy source code
COPY . .

# Build
RUN dotnet build "ShagoFinote/ShagoFinote.Api.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "ShagoFinote/ShagoFinote.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["dotnet", "ShagoFinote.Api.dll"]
