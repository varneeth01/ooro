package com.ooro.driver.duty

import com.ooro.driver.data.DriverDatabase
import com.ooro.driver.data.DutyLocationEntity
import com.ooro.driver.domain.DutyLocationSample

class LocationSyncRepository(private val database: DriverDatabase) {
    suspend fun save(sample: DutyLocationSample) = database.dutyLocations().add(DutyLocationEntity(sample.id, sample.dutySessionId, sample.timestamp.toString(), sample.latitude, sample.longitude, sample.accuracyMeters, sample.speedMps, sample.bearing))
}
