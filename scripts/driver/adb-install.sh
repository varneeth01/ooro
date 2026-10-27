#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERIAL="${1:-${ANDROID_SERIAL:-}}"
APK="${2:-$ROOT_DIR/apps/driver-android/app/build/outputs/apk/debug/app-debug.apk}"
if [[ -z "$SERIAL" ]]; then SERIAL="$("$ROOT_DIR/scripts/driver/adb-detect.sh" | sed -n 's/.*"serial":"\([^"]*\)".*/\1/p')"; fi
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/home/varneeth/Android/Sdk}}"
ADB_BIN="${ADB_BIN:-$SDK_PATH/platform-tools/adb}"

[[ -f "$APK" ]] || { echo "APK not found: $APK" >&2; exit 2; }
"$ADB_BIN" -s "$SERIAL" get-state | grep -qx device || { echo "Device is not online/authorized: $SERIAL" >&2; exit 3; }
install_output="$($ADB_BIN -s "$SERIAL" install -r -t "$APK")"
printf '%s\n' "$install_output" >&2
grep -q '^Success' <<<"$install_output" || { echo "APK installation failed" >&2; exit 4; }
version="$($ADB_BIN -s "$SERIAL" shell dumpsys package com.ooro.driver | sed -n 's/.*versionName=\([^ ]*\).*/\1/p' | head -1 | tr -d '\r')"
printf '{"serial":"%s","package":"com.ooro.driver","version":"%s","installed":true}\n' "$SERIAL" "$version"
