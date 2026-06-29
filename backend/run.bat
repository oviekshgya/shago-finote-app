@echo off
REM Shago Finote Backend Runner Script for Windows
REM Usage: run.bat [option]

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         Shago Finote Backend Runner                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

if "%1"=="" goto menu
if "%1"=="docker" goto docker
if "%1"=="local" goto local
if "%1"=="logs" goto logs
if "%1"=="stop" goto stop
if "%1"=="health" goto health
goto usage

:menu
cls
echo Choose how to run the backend:
echo.
echo   1) Docker Compose (Recommended) - Easiest
echo   2) Local .NET - For development
echo   3) Show Docker Logs
echo   4) Stop All Services
echo   5) Health Check
echo   0) Exit
echo.
set /p option="Enter option: "

if "%option%"=="1" goto docker
if "%option%"=="2" goto local
if "%option%"=="3" goto logs
if "%option%"=="4" goto stop
if "%option%"=="5" goto health
if "%option%"=="0" exit /b 0
echo Invalid option
timeout /t 2
goto menu

:docker
echo.
echo Starting backend with Docker Compose...
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker not installed
    echo Install from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker-compose up -d

echo.
echo Services available:
echo   API:     http://localhost:5000
echo   Swagger: http://localhost:5000/swagger
echo   PgAdmin: http://localhost:5050
echo.
echo Waiting for API to be ready...

timeout /t 5 /nobreak

for /l %%i in (1,1,30) do (
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing; Write-Host 'API is ready!' } catch { }"
    if !errorlevel! equ 0 goto docker_done
    timeout /t 1 /nobreak
)

:docker_done
echo.
echo Next: Open http://localhost:5000/swagger to test API
echo.
pause
goto menu

:local
echo.
echo Starting backend locally (.NET)...
echo.

where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: .NET SDK not installed
    echo Install from: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

cd ShagoFinote
echo Restoring packages...
dotnet restore

echo.
echo Starting API...
dotnet run

:logs
echo.
echo Showing Docker logs...
echo.

docker-compose logs -f api
goto menu

:stop
echo.
echo Stopping all services...
echo.

docker-compose down

echo.
echo Services stopped
echo.
pause
goto menu

:health
echo.
echo Checking backend health...
echo.

echo Checking Docker containers...
docker-compose ps
echo.

echo Checking API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host 'API is healthy' } } catch { Write-Host 'API is not responding' }"

echo.
echo Checking database...
docker exec shagofinote-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL is running
) else (
    echo PostgreSQL is not responding
)

echo.
pause
goto menu

:usage
echo Usage: run.bat [option]
echo.
echo Options:
echo   docker   - Start with Docker
echo   local    - Start with local .NET
echo   logs     - Show Docker logs
echo   stop     - Stop services
echo   health   - Check health
echo.
echo Without options, shows interactive menu.
pause
exit /b 1
