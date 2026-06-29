#!/usr/bin/env bash
set -euo pipefail

# Shago Finote - one-command Android release install
# Usage: npm run dev:android
#
# This intentionally builds a release APK instead of a debug APK so the app
# does not need Metro and will not show the red development-server screen.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="com.shago.finote"
JAVA17_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

cd "$ROOT_DIR"

if [[ -d "$JAVA17_HOME" ]]; then
  export JAVA_HOME="$JAVA17_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "== Shago Finote Android Release Runner =="
echo
echo "[1/5] Java"
java -version
echo

echo "[2/5] Device"
adb wait-for-device
DEVICE="$(adb devices | awk '/\tdevice$/{print $1; exit}')"
if [[ -z "$DEVICE" ]]; then
  echo "No authorized Android device found."
  adb devices
  exit 1
fi
echo "Device: $DEVICE"
echo

echo "[3/5] Build release APK"
cd "$ROOT_DIR/android"
./gradlew assembleRelease
cd "$ROOT_DIR"
echo

if [[ ! -f "$APK_PATH" ]]; then
  echo "Release APK not found: $APK_PATH"
  exit 1
fi

echo "[4/5] Install release APK"
if adb install -r "$APK_PATH"; then
  echo "Installed with data preserved."
else
  echo "Install -r failed. Reinstalling clean because signature/data may differ."
  adb uninstall "$APP_ID" >/dev/null 2>&1 || true
  adb install "$APK_PATH"
fi
echo

echo "[5/5] Launch app"
adb shell monkey -p "$APP_ID" 1 >/dev/null
echo "Done. App launched: $APP_ID"

