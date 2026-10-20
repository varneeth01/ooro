package com.ooro.deviceagent.model

data class DeviceCredentials(val managedDeviceId: String, val displayId: String, val credentialId: String, val token: String)
data class Release(val id: String, val packageName: String, val versionCode: Long, val versionName: String, val minSdk: Int, val targetSdk: Int, val sha256: String, val certificateSha256: String, val sizeBytes: Long)
data class DeploymentTarget(val id: String, val state: String, val campaignState: String, val attemptNumber: Int, val nextAttemptAt: String?, val maintenanceWindowStart: String?, val maintenanceWindowEnd: String?, val release: Release)
