#!/bin/bash

# Shago Finote Backend Runner Script
# Usage: ./run.sh [option]

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Shago Finote Backend Runner                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
show_menu() {
    echo -e "${BLUE}Choose how to run the backend:${NC}"
    echo ""
    echo "  1) Docker Compose (Recommended) - Easiest"
    echo "  2) Local .NET - For development"
    echo "  3) Show Docker Logs"
    echo "  4) Stop All Services"
    echo "  5) View Database (PgAdmin)"
    echo "  6) Health Check"
    echo "  0) Exit"
    echo ""
}

run_docker() {
    echo -e "${GREEN}Starting backend with Docker Compose...${NC}"
    echo ""
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not installed${NC}"
        echo "  Install from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✓ Backend started!${NC}"
    echo ""
    echo "Services available:"
    echo -e "  ${BLUE}API:${NC}     http://localhost:5000"
    echo -e "  ${BLUE}Swagger:${NC} http://localhost:5000/swagger"
    echo -e "  ${BLUE}PgAdmin:${NC} http://localhost:5050"
    echo ""
    
    # Wait for API to be healthy
    echo "Waiting for API to be ready..."
    sleep 5
    
    for i in {1..30}; do
        if curl -s http://localhost:5000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API is ready!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    echo ""
    echo -e "${YELLOW}Next: Open http://localhost:5000/swagger to test API${NC}"
}

run_local() {
    echo -e "${GREEN}Starting backend locally (.NET)...${NC}"
    echo ""
    
    if ! command -v dotnet &> /dev/null; then
        echo -e "${RED}✗ .NET SDK not installed${NC}"
        echo "  Install from: https://dotnet.microsoft.com/download"
        exit 1
    fi
    
    cd ShagoFinote
    
    echo "Restoring packages..."
    dotnet restore
    
    echo ""
    echo -e "${GREEN}Starting API...${NC}"
    dotnet run
}

show_logs() {
    echo -e "${GREEN}Showing Docker logs...${NC}"
    echo ""
    
    if [ "$(docker-compose ps -q api)" ]; then
        docker-compose logs -f api
    else
        echo -e "${RED}✗ Docker containers not running${NC}"
        echo "  Start them first with option 1"
    fi
}

stop_services() {
    echo -e "${GREEN}Stopping all services...${NC}"
    
    if [ "$(docker-compose ps -q)" ]; then
        docker-compose down
        echo -e "${GREEN}✓ Services stopped${NC}"
    else
        echo -e "${YELLOW}No services running${NC}"
    fi
}

open_pgadmin() {
    echo -e "${GREEN}Opening PgAdmin in browser...${NC}"
    
    if command -v open &> /dev/null; then
        # macOS
        open http://localhost:5050
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:5050
    elif command -v start &> /dev/null; then
        # Windows
        start http://localhost:5050
    else
        echo "Visit: http://localhost:5050"
        echo "Login: admin@shagofinote.app / admin"
    fi
}

health_check() {
    echo -e "${GREEN}Checking backend health...${NC}"
    echo ""
    
    echo "Checking Docker containers..."
    if command -v docker &> /dev/null; then
        docker-compose ps
        echo ""
    fi
    
    echo "Checking API..."
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is healthy${NC}"
    else
        echo -e "${RED}✗ API is not responding${NC}"
        echo "  Try: ./run.sh (select option 1)"
    fi
    
    echo ""
    echo "Checking database..."
    if docker exec shagofinote-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${RED}✗ PostgreSQL is not responding${NC}"
    fi
}

# Main
if [ $# -eq 0 ]; then
    while true; do
        show_menu
        read -p "Enter option: " option
        
        case $option in
            1) run_docker ;;
            2) run_local ;;
            3) show_logs ;;
            4) stop_services ;;
            5) open_pgadmin ;;
            6) health_check ;;
            0) echo "Goodbye!"; exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
else
    case $1 in
        docker) run_docker ;;
        local) run_local ;;
        logs) show_logs ;;
        stop) stop_services ;;
        pgadmin) open_pgadmin ;;
        health) health_check ;;
        *)
            echo "Usage: $0 [option]"
            echo ""
            echo "Options:"
            echo "  docker   - Start with Docker"
            echo "  local    - Start with local .NET"
            echo "  logs     - Show Docker logs"
            echo "  stop     - Stop services"
            echo "  pgadmin  - Open PgAdmin"
            echo "  health   - Check health"
            echo ""
            echo "Without options, shows interactive menu."
            ;;
    esac
fi
