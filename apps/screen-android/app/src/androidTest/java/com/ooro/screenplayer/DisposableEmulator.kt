package com.ooro.screenplayer

import android.os.Build
import org.junit.Assume.assumeTrue

/** Keep UI fixtures and permission-mutating tests off physical signage boards. */
internal fun assumeDisposableEmulator() {
    assumeTrue(
        "This instrumentation test must run on a disposable emulator",
        Build.FINGERPRINT.contains("generic", ignoreCase = true) ||
            Build.MODEL.contains("emulator", ignoreCase = true) ||
            Build.PRODUCT.startsWith("sdk_", ignoreCase = true) ||
            Build.DEVICE.startsWith("emu", ignoreCase = true),
    )
}
