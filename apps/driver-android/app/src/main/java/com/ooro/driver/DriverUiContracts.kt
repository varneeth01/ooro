package com.ooro.driver

enum class DriverRoute {
    AUTH,
    REGISTRATION,
    REVIEW_STATUS,
    DISPLAY_SETUP,
    DASHBOARD
}

fun resolveDriverRoute(
    authenticated: Boolean,
    onboardingStatus: String?,
    accountStatus: String?,
    assignedDisplayLabel: String?
): DriverRoute = when {
    !authenticated -> DriverRoute.AUTH
    onboardingStatus == "DRAFT" || onboardingStatus == "NOT_STARTED" -> DriverRoute.REGISTRATION
    onboardingStatus == "APPROVED" && accountStatus == "ACTIVE" && assignedDisplayLabel.isNullOrBlank() -> DriverRoute.DISPLAY_SETUP
    onboardingStatus == "APPROVED" && accountStatus == "ACTIVE" -> DriverRoute.DASHBOARD
    else -> DriverRoute.REVIEW_STATUS
}

fun isServerApprovedDriver(onboardingStatus: String, accountStatus: String): Boolean =
    onboardingStatus == "APPROVED" && accountStatus == "ACTIVE"

fun resolveAssignedVehicleId(explicitVehicleId: String?, serverVehicleId: String?): String =
    explicitVehicleId?.takeIf { it.isNotBlank() }
        ?: serverVehicleId?.takeIf { it.isNotBlank() }
        ?: error("No approved vehicle is assigned yet")
