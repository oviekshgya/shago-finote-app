#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="com.shago.finote"
PORT="${RN_DEV_PORT:-8081}"
JAVA17_HOME="/usr/lib/jvm/java-17-openjdk-amd64"

cd "$ROOT_DIR"

if [[ -d "$JAVA17_HOME" ]]; then
  export JAVA_HOME="$JAVA17_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "Java:"
java -version

if ! adb get-state >/dev/null 2>&1; then
  echo "No Android device detected. Connect a device and enable USB debugging."
  adb devices
  exit 1
fi

echo "Starting Metro on port $PORT..."
if curl -fsS "http://127.0.0.1:$PORT/status" >/dev/null 2>&1; then
  echo "Metro already running."
else
  npx react-native start --reset-cache --host 0.0.0.0 --port "$PORT" >/tmp/shago-finote-metro.log 2>&1 &
  METRO_PID=$!
  for _ in {1..45}; do
    if curl -fsS "http://127.0.0.1:$PORT/status" >/dev/null 2>&1; then
      echo "Metro ready."
      break
    fi
    sleep 1
  done

  if ! curl -fsS "http://127.0.0.1:$PORT/status" >/dev/null 2>&1; then
    echo "Metro failed to start. Last logs:"
    tail -n 80 /tmp/shago-finote-metro.log || true
    kill "$METRO_PID" >/dev/null 2>&1 || true
    exit 1
  fi
fi

echo "Configuring ADB reverse..."
adb reverse --remove-all >/dev/null 2>&1 || true
adb reverse "tcp:$PORT" "tcp:$PORT"
adb reverse --list

echo "Installing debug APK..."
npx react-native run-android --no-packager --port "$PORT"

echo "Restarting app..."
adb shell am force-stop "$APP_ID" || true
adb shell am start -n "$APP_ID/.MainActivity"

echo
echo "Done. If the red Metro screen still appears, press r in this terminal or shake/open dev menu and Reload."
echo "Metro log: /tmp/shago-finote-metro.log"

if [[ -n "${METRO_PID:-}" ]]; then
  echo "Metro is running in background with PID $METRO_PID."
fi
