import importlib.util
import subprocess
import unittest
from pathlib import Path
from unittest.mock import Mock


SCRIPT = Path(__file__).with_name("connected-test-safe.py")
SPEC = importlib.util.spec_from_file_location("connected_test_safe", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


def completed(stdout: str = ""):
    return subprocess.CompletedProcess(args=[], returncode=0, stdout=stdout, stderr="")


class ConnectedTestPreflightTests(unittest.TestCase):
    serial = "emulator-5554"
    props = {
        "ro.kernel.qemu": "1",
        "ro.boot.qemu": "1",
        "ro.hardware": "ranchu",
        "ro.product.model": "sdk_gphone64_x86_64",
        "ro.product.name": "sdk_gphone64_x86_64",
        "ro.build.characteristics": "emulator",
    }

    def adb(self, devices: str, overrides=None):
        values = self.props | (overrides or {})

        def run(command, **kwargs):
            if command[1:] == ["devices", "-l"]:
                return completed(devices)
            if len(command) == 6 and command[1:4] == ["-s", self.serial, "shell"]:
                return completed(values.get(command[5], ""))
            raise AssertionError(f"Unexpected ADB command: {command}")

        return Mock(side_effect=run)

    def verify(self, devices, overrides=None, serial=None, allowlist=None):
        return MODULE.verify_target("adb", serial or self.serial, allowlist or self.serial, self.adb(devices, overrides))

    def test_accepts_verified_single_disposable_emulator(self):
        props = self.verify("List of devices attached\nemulator-5554 device product:sdk_gphone64_x86_64\n")
        self.assertEqual("ranchu", props["ro.hardware"])

    def test_accepts_aosp_sdk_phone_avd_with_full_qemu_identity(self):
        self.verify(
            "List of devices attached\nemulator-5554 device product:sdk_phone64_x86_64\n",
            {"ro.product.model": "Android SDK built for x86_64", "ro.product.name": "sdk_phone64_x86_64"},
        )

    def test_rejects_physical_mbox_even_if_named_like_emulator(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify("List of devices attached\nemulator-5554 device\n", {"ro.hardware": "sun50iw9p1"})

    def test_rejects_multiple_devices_as_ambiguous(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify("List of devices attached\nemulator-5554 device\nMBOX-10 device\n")

    def test_rejects_unauthorized_target(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify("List of devices attached\nemulator-5554 unauthorized\n")

    def test_rejects_offline_target(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify("List of devices attached\nemulator-5554 offline\n")

    def test_rejects_absent_emulator(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify("List of devices attached\n")

    def test_rejects_spoofed_emulator_serial_and_name_without_emulator_properties(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify(
                "List of devices attached\nemulator-5554 device model:MBOX - 10\n",
                {"ro.kernel.qemu": "0", "ro.boot.qemu": "0", "ro.hardware": "sun50iw9p1", "ro.product.model": "MBOX - 10", "ro.product.name": "MBOX", "ro.build.characteristics": "default"},
            )

    def test_requires_exact_allowlisted_serial(self):
        with self.assertRaises(MODULE.UnsafeTarget):
            self.verify("List of devices attached\nemulator-5554 device\n", allowlist="emulator-5556")


if __name__ == "__main__":
    unittest.main()
