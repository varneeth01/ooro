package com.ooro.deviceagent.install

import android.content.pm.PackageInstaller
import org.junit.Assert.assertEquals
import org.junit.Test

class ApkInstallerPolicyTest {
    @Test
    fun pendingUserActionIsDurableAndNotReportedAsSuccess() {
        assertEquals("PENDING_USER_ACTION", installerCallbackState(PackageInstaller.STATUS_PENDING_USER_ACTION))
    }

    @Test
    fun packageInstallerSuccessIsSeparateFromHealth() {
        assertEquals("INSTALLED", installerCallbackState(PackageInstaller.STATUS_SUCCESS))
        assertEquals("FAILED", installerCallbackState(PackageInstaller.STATUS_FAILURE))
    }
}
