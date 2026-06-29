#!/bin/bash

# Shago Finote - One-Command Android Debug & Run
# Usage: npm run dev:android

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Shago Finote - Android Dev Environment               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}[1/4]${NC} Checking prerequisites..."
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm not found${NC}"
  exit 1
fi

if ! command -v adb &> /dev/null; then
  echo -e "${RED}Error: adb not found. Install Android SDK Platform Tools.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}[2/4]${NC} Installing dependencies..."
npm install --legacy-peer-deps > /dev/null 2>&1 || {
  echo -e "${RED}✗ npm install failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Start Metro bundler in background
echo -e "${BLUE}[3/4]${NC} Starting Metro bundler..."
npm start > /tmp/metro.log 2>&1 &
METRO_PID=$!
sleep 3

if ! kill -0 $METRO_PID 2>/dev/null; then
  echo -e "${RED}✗ Metro bundler failed to start${NC}"
  cat /tmp/metro.log
  exit 1
fi
echo -e "${GREEN}✓ Metro bundler running (PID: $METRO_PID)${NC}"
echo ""

# Wait for device
echo -e "${BLUE}[4/4]${NC} Waiting for Android device..."
if ! adb wait-for-device &> /dev/null; then
  kill $METRO_PID 2>/dev/null || true
  echo -e "${RED}✗ No Android device found${NC}"
  echo "Please connect Android device via USB or start emulator."
  exit 1
fi

DEVICE=$(adb devices | grep -E '\tdevice$' | head -1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
  kill $METRO_PID 2>/dev/null || true
  echo -e "${RED}✗ No authorized device found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Device connected: $DEVICE${NC}"
echo ""

echo -e "${BLUE}[BUILD]${NC} Building and installing APK..."
cd android
./gradlew installDebug > /tmp/build.log 2>&1 || {
  echo -e "${RED}✗ Build failed${NC}"
  tail -50 /tmp/build.log
  kill $METRO_PID 2>/dev/null || true
  exit 1
}
cd ..
echo -e "${GREEN}✓ APK installed successfully${NC}"
echo ""

echo -e "${BLUE}[LAUNCH]${NC} Launching app on device..."
adb shell am start -n com.shagofintoe/.MainActivity || {
  echo -e "${RED}✗ Failed to launch app${NC}"
  kill $METRO_PID 2>/dev/null || true
  exit 1
}
echo -e "${GREEN}✓ App launched${NC}"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Android dev environment ready!${NC}"
echo ""
echo "Device: $DEVICE"
echo "Metro:  http://localhost:8081"
echo ""
echo "Debug commands:"
echo "  adb logcat         - View logs"
echo "  adb shell pm dump  - App info"
echo ""
echo "Press Ctrl+C to stop Metro bundler"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Keep Metro running
wait $METRO_PID
