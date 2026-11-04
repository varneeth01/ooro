#!/usr/bin/env bash
set -euo pipefail

serial="${1:-6c001040f441c941d94}"
mode="${2:?Pass a label for the manually selected test mode}"
out_dir="${3:-evidence/screen-fit-thermal/device-profile}"
sample_count="${4:-5}"
interval_seconds="${5:-10}"
package="com.ooro.screenplayer"

if ! [[ "$sample_count" =~ ^[1-9][0-9]*$ && "$interval_seconds" =~ ^[1-9][0-9]*$ ]]; then
  echo "sample_count and interval_seconds must be positive integers" >&2
  exit 2
fi

state="$(adb -s "$serial" get-state 2>/dev/null || true)"
if [[ "$state" != "device" ]]; then
  echo "ADB device $serial is unavailable (state: ${state:-not found}); no profile collected." >&2
  exit 3
fi

mkdir -p "$out_dir"
for ((sample = 1; sample <= sample_count; sample++)); do
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  file="$out_dir/${mode}-${stamp}-${sample}.txt"
  {
    echo "mode=$mode sample=$sample/$sample_count host_utc=$stamp serial=$serial"
    echo '--- device clock / uptime ---'
    adb -s "$serial" shell 'date -u; cat /proc/uptime'
    echo '--- package / foreground / HOME ---'
    adb -s "$serial" shell "dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity|Hist #|TaskRecord' | tail -40" || true
    adb -s "$serial" shell "dumpsys activity processes | grep -E 'mHomeProcess|ProcessRecord|com.ooro.screenplayer'" || true
    adb -s "$serial" shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME || true
    echo '--- CPU process and thread sample ---'
    adb -s "$serial" shell 'top -b -n 1 -H' || true
    echo '--- OORO PSS/RSS ---'
    adb -s "$serial" shell "dumpsys meminfo $package" || true
    echo '--- graphics frame statistics ---'
    adb -s "$serial" shell "dumpsys gfxinfo $package framestats" || true
    echo '--- SurfaceFlinger layers ---'
    adb -s "$serial" shell 'dumpsys SurfaceFlinger --list' || true
    echo '--- MediaCodec diagnostics ---'
    adb -s "$serial" shell 'dumpsys media.codec' || true
    echo '--- thermal service / board thermal zones ---'
    adb -s "$serial" shell 'dumpsys thermalservice; for z in /sys/class/thermal/thermal_zone*; do [ -d "$z" ] || continue; echo "$z"; cat "$z/type" "$z/temp" 2>/dev/null; done' || true
    echo '--- CPU frequency ---'
    adb -s "$serial" shell 'for f in /sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_cur_freq; do [ -r "$f" ] || continue; echo "$f $(cat "$f")"; done' || true
    echo '--- battery / power ---'
    adb -s "$serial" shell 'dumpsys battery; dumpsys power' || true
    echo '--- OORO services / scheduled jobs ---'
    adb -s "$serial" shell "dumpsys activity services $package" || true
    adb -s "$serial" shell 'dumpsys jobscheduler' | grep -C 3 "$package" || true
  } > "$file" 2>&1
  echo "Saved $file"
  if ((sample < sample_count)); then sleep "$interval_seconds"; fi
done

echo "Review thermal-service and sensor readings after each short run; stop immediately if the board becomes excessively hot or reports a severe thermal state."
