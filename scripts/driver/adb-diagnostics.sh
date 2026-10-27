#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERIAL="${1:-${ANDROID_SERIAL:-}}"
if [[ -z "$SERIAL" ]]; then SERIAL="$("$ROOT_DIR/scripts/driver/adb-detect.sh" | sed -n 's/.*"serial":"\([^"]*\)".*/\1/p')"; fi
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/home/varneeth/Android/Sdk}}"
ADB_BIN="${ADB_BIN:-$SDK_PATH/platform-tools/adb}"
REPORT_DIR="${DRIVER_ADB_REPORT_DIR:-$ROOT_DIR/artifacts/driver/adb}"
mkdir -p "$REPORT_DIR"

out="$REPORT_DIR/diagnostics-$SERIAL.txt"
{
  echo "OORO Driver ADB diagnostics"
  echo "serial=$SERIAL"
  echo "manufacturer=$($ADB_BIN -s "$SERIAL" shell getprop ro.product.manufacturer | tr -d '\r')"
  echo "model=$($ADB_BIN -s "$SERIAL" shell getprop ro.product.model | tr -d '\r')"
  echo "android=$($ADB_BIN -s "$SERIAL" shell getprop ro.build.version.release | tr -d '\r')"
  echo "api=$($ADB_BIN -s "$SERIAL" shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "--- package ---"
  "$ADB_BIN" -s "$SERIAL" shell dumpsys package com.ooro.driver | grep -E 'versionName=|versionCode=|requested permissions:|android.permission.(ACCESS|FOREGROUND|POST_NOTIFICATIONS|BIND_NOTIFICATION)' | head -60 | tr -d '\r' || true
  echo "--- activity ---"
  "$ADB_BIN" -s "$SERIAL" shell dumpsys activity activities | grep -E 'mResumedActivity|com.ooro.driver' | head -20 | tr -d '\r' || true
  echo "--- services ---"
  "$ADB_BIN" -s "$SERIAL" shell dumpsys activity services com.ooro.driver | grep -E 'Ooro|DriverDuty|foreground|ServiceRecord' | head -60 | tr -d '\r' || true
  echo "--- notification listener ---"
  "$ADB_BIN" -s "$SERIAL" shell dumpsys notification | grep -E 'com.ooro.driver|listeners' | head -40 | tr -d '\r' || true
  echo "--- OORO location permission/app-ops state ---"
  "$ADB_BIN" -s "$SERIAL" shell cmd appops get com.ooro.driver 2>/dev/null | grep -E 'COARSE_LOCATION|FINE_LOCATION|ACCESS_BACKGROUND_LOCATION|RUN_IN_BACKGROUND|START_FOREGROUND' | sed -E 's/[0-9]{1,3}(\.[0-9]+)?,[[:space:]]*[0-9]{1,3}(\.[0-9]+)?/[REDACTED_COORDINATE]/g' | head -40 | tr -d '\r' || true
  echo "--- filtered crash/anr log ---"
  "$ADB_BIN" -s "$SERIAL" logcat -d -v brief -t 400 | grep -E 'FATAL EXCEPTION|ANR in com\.ooro\.driver|com\.ooro\.driver.*(Exception|crash|DeadObject)' | tail -40 | sed -E 's/(Bearer|token|authorization|password|aadhaar|bank)[=:][^ ]+/\1=[REDACTED]/Ig' || true
} >"$out"
printf '{"serial":"%s","diagnostics":"%s"}\n' "$SERIAL" "$out"
