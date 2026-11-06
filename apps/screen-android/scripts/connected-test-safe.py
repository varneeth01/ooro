#!/usr/bin/env python3
"""Fail-closed gate before Gradle can install instrumentation APKs."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Callable


class UnsafeTarget(RuntimeError):
    pass


Run = Callable[..., subprocess.CompletedProcess[str]]


def _run_adb(adb: str, args: list[str], run: Run) -> str:
    try:
        result = run([adb, *args], check=True, capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError) as exc:
        raise UnsafeTarget(f"ADB preflight command failed: {exc}") from exc
    return result.stdout.strip()


def _device_entries(output: str) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for raw in output.splitlines():
        line = raw.strip()
        if not line or line.startswith("List of devices attached") or line.startswith("*"):
            continue
        fields = line.split()
        if len(fields) >= 2:
            entries.append((fields[0], fields[1]))
    return entries


def verify_target(adb: str, serial: str, allowlisted_serial: str, run: Run = subprocess.run) -> dict[str, str]:
    if not serial or serial != allowlisted_serial:
        raise UnsafeTarget("--serial must exactly match OORO_DISPOSABLE_EMULATOR_SERIAL")
    if not re.fullmatch(r"emulator-[0-9]+", serial):
        raise UnsafeTarget("Target serial must be an Android emulator serial (emulator-N), never a device name")

    entries = _device_entries(_run_adb(adb, ["devices", "-l"], run))
    if len(entries) != 1:
        detail = ", ".join(f"{name}={state}" for name, state in entries) or "none"
        raise UnsafeTarget(f"Expected exactly one connected ADB target; found: {detail}")
    if entries[0] != (serial, "device"):
        raise UnsafeTarget(f"Expected only authorized target {serial}=device; found {entries[0][0]}={entries[0][1]}")

    props: dict[str, str] = {}
    for prop in ("ro.kernel.qemu", "ro.boot.qemu", "ro.hardware", "ro.product.model", "ro.product.name", "ro.build.characteristics"):
        value = _run_adb(adb, ["-s", serial, "shell", "getprop", prop], run)
        props[prop] = value.strip()

    hardware = props["ro.hardware"].lower()
    model = props["ro.product.model"].lower()
    product = props["ro.product.name"].lower()
    characteristics = {part.strip().lower() for part in props["ro.build.characteristics"].split(",")}
    if props["ro.kernel.qemu"] != "1" or props["ro.boot.qemu"] != "1":
        raise UnsafeTarget("QEMU boot properties do not identify an Android emulator")
    if hardware not in {"ranchu", "goldfish"}:
        raise UnsafeTarget(f"Unrecognized emulator hardware: {hardware or 'empty'}")
    sdk_product = model.startswith("sdk_gphone") or product.startswith("sdk_gphone") or "emulator" in model
    if not sdk_product or "emulator" not in characteristics:
        raise UnsafeTarget("SDK product/model and emulator build characteristic did not match")
    return props


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", required=True, help="Exact disposable AVD serial, e.g. emulator-5554")
    parser.add_argument("--preflight-only", action="store_true", help="Verify the device without invoking Gradle")
    parser.add_argument("--adb", default=os.environ.get("ADB", "adb"), help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    allowlisted = os.environ.get("OORO_DISPOSABLE_EMULATOR_SERIAL", "")
    try:
        props = verify_target(args.adb, args.serial, allowlisted)
    except UnsafeTarget as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        return 2

    print(f"SAFE TEST TARGET: {args.serial} ({props['ro.product.model']}, {props['ro.hardware']})")
    if args.preflight_only:
        print("Preflight passed; no Gradle task or APK installation was started.")
        return 0

    root = Path(__file__).resolve().parents[1]
    gradle = root / "gradlew"
    env = os.environ.copy()
    env["ANDROID_SERIAL"] = args.serial
    command = [
        str(gradle), "--no-daemon", "connectedDebugAndroidTest",
        f"-Pandroid.injected.device.serial={args.serial}",
        "-PuseMockBackend=false", "-PdeviceApiBaseUrl=https://api-staging.theooro.com",
    ]
    # Refuse if the allowlist changed during the preflight; keep Gradle on the exact target.
    if env.get("OORO_DISPOSABLE_EMULATOR_SERIAL") != args.serial:
        print("REFUSED: emulator allowlist changed after preflight", file=sys.stderr)
        return 2
    return subprocess.run(command, cwd=root, env=env, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
