#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SERIAL="${1:-${ANDROID_SERIAL:-}}"
if [[ -z "$SERIAL" ]]; then SERIAL="$("$ROOT_DIR/scripts/driver/adb-detect.sh" | sed -n 's/.*"serial":"\([^"]*\)".*/\1/p')"; fi

detect="$($ROOT_DIR/scripts/driver/adb-detect.sh "$SERIAL")"
install="$($ROOT_DIR/scripts/driver/adb-install.sh "$SERIAL")"
launch="$($ROOT_DIR/scripts/driver/adb-launch.sh "$SERIAL")"
diagnostics="$($ROOT_DIR/scripts/driver/adb-diagnostics.sh "$SERIAL")"
printf '{"pilotCheck":true,"device":%s,"install":%s,"launch":%s,"diagnostics":%s,"stagingConnected":false,"note":"debug build is mock-backed; staging endpoint is not configured"}\n' "$detect" "$install" "$launch" "$diagnostics"
