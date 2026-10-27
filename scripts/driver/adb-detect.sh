#!/usr/bin/env bash
set -euo pipefail

SDK_PATH="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/home/varneeth/Android/Sdk}}"
ADB_BIN="${ADB_BIN:-$SDK_PATH/platform-tools/adb}"

if [[ ! -x "$ADB_BIN" ]]; then
  echo "ADB not found: $ADB_BIN" >&2
  exit 2
fi

requested="${1:-${ANDROID_SERIAL:-}}"
if [[ -n "$requested" ]]; then
  line="$($ADB_BIN devices -l | awk -v serial="$requested" '$1 == serial { print; exit }')"
else
  line="$($ADB_BIN devices -l | awk '$1 != "List" && $2 == "device" { print; exit }')"
fi

if [[ -z "$line" ]]; then
  echo "No authorized online ADB device found${requested:+ for $requested}" >&2
  $ADB_BIN devices -l >&2 || true
  exit 3
fi

serial="$(awk '{print $1}' <<<"$line")"
state="$(awk '{print $2}' <<<"$line")"
if [[ "$state" != "device" ]]; then
  echo "ADB device is not authorized/online: $line" >&2
  exit 4
fi

model="$(sed -n 's/.* model:\([^ ]*\).*/\1/p' <<<"$line")"
api="$($ADB_BIN -s "$serial" shell getprop ro.build.version.sdk | tr -d '\r')"
manufacturer="$($ADB_BIN -s "$serial" shell getprop ro.product.manufacturer | tr -d '\r')"
kind="physical"
[[ "$serial" == emulator-* ]] && kind="emulator"

printf '{"serial":"%s","kind":"%s","manufacturer":"%s","model":"%s","api":"%s"}\n' \
  "$serial" "$kind" "$manufacturer" "$model" "$api"
