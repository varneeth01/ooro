package com.ooro.driver

fun isServerApprovedDriver(onboardingStatus: String, accountStatus: String): Boolean =
    onboardingStatus == "APPROVED" && accountStatus == "ACTIVE"

fun resolveAssignedVehicleId(explicitVehicleId: String?, serverVehicleId: String?): String =
    explicitVehicleId?.takeIf { it.isNotBlank() }
        ?: serverVehicleId?.takeIf { it.isNotBlank() }
        ?: error("No approved vehicle is assigned yet")
