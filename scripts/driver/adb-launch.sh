#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERIAL="${1:-${ANDROID_SERIAL:-}}"
if [[ -z "$SERIAL" ]]; then SERIAL="$("$ROOT_DIR/scripts/driver/adb-detect.sh" | sed -n 's/.*"serial":"\([^"]*\)".*/\1/p')"; fi
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/home/varneeth/Android/Sdk}}"
ADB_BIN="${ADB_BIN:-$SDK_PATH/platform-tools/adb}"

"$ADB_BIN" -s "$SERIAL" shell am start -W -n com.ooro.driver/.MainActivity >&2
sleep 2
if "$ADB_BIN" -s "$SERIAL" shell dumpsys activity activities | grep -q 'com.ooro.driver/.MainActivity'; then
  printf '{"serial":"%s","package":"com.ooro.driver","activity":".MainActivity","started":true}\n' "$SERIAL"
else
  echo "Driver activity was not observed after launch" >&2
  exit 5
fi
