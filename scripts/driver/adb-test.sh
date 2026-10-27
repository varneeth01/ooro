#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERIAL="${1:-${ANDROID_SERIAL:-}}"
if [[ -z "$SERIAL" ]]; then SERIAL="$("$ROOT_DIR/scripts/driver/adb-detect.sh" | sed -n 's/.*"serial":"\([^"]*\)".*/\1/p')"; fi
SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/home/varneeth/Android/Sdk}}"
ADB_BIN="${ADB_BIN:-$SDK_PATH/platform-tools/adb}"
REPORT_DIR="${DRIVER_ADB_REPORT_DIR:-$ROOT_DIR/artifacts/driver/adb}"
mkdir -p "$REPORT_DIR"
VARIANT="${DRIVER_TEST_VARIANT:-isolated}"
VARIANT_CAP="${VARIANT^}"

export ANDROID_SERIAL="$SERIAL"
set +e
(cd "$ROOT_DIR/apps/driver-android" && ./gradlew --no-daemon "connected${VARIANT_CAP}AndroidTest") >"$REPORT_DIR/connected-test.log" 2>&1
status=$?
set -e

xml="$(find "$ROOT_DIR/apps/driver-android/app/build/outputs/androidTest-results/connected" -path "*/${VARIANT}/*" -name 'TEST-*.xml' -type f 2>/dev/null | head -1 || true)"
if [[ -n "$xml" ]]; then
  tests="$(sed -n "s/.*tests=\"\([0-9]*\)\".*/\1/p" "$xml" | head -1)"
  failures="$(sed -n "s/.*failures=\"\([0-9]*\)\".*/\1/p" "$xml" | head -1)"
  errors="$(sed -n "s/.*errors=\"\([0-9]*\)\".*/\1/p" "$xml" | head -1)"
  skipped="$(sed -n "s/.*skipped=\"\([0-9]*\)\".*/\1/p" "$xml" | head -1)"
else
  tests=0; failures=0; errors=0; skipped=0
fi
printf '{"serial":"%s","tests":%s,"failures":%s,"errors":%s,"skipped":%s,"gradleExit":%s,"report":"%s"}\n' \
  "$SERIAL" "$tests" "$failures" "$errors" "$skipped" "$status" "$REPORT_DIR/connected-test.log"
exit "$status"
