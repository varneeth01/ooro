package com.ooro.driver.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.ooro.driver.data.DriverDatabase
import com.ooro.driver.data.SecureSessionStore
import com.ooro.driver.network.ApiProvider
import com.ooro.driver.domain.LocationSample
import com.ooro.driver.domain.NormalizedRideEvent
import com.ooro.driver.domain.RideEventType
import com.ooro.driver.domain.DutyLocationSample
import java.time.Instant

class DriverSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result { val db = DriverDatabase.get(applicationContext); val session = SecureSessionStore(applicationContext); if (session.get() == null) return Result.success(); return runCatching { val api = ApiProvider(object : com.ooro.driver.network.SecureTokenProvider { override fun token() = session.get()?.accessToken }).api; val events = db.rides().pendingEvents(50); if (events.isNotEmpty()) { api.sendRideEvents(events.map { NormalizedRideEvent(eventId = it.eventId, provider = it.provider, eventType = runCatching { RideEventType.valueOf(it.type) }.getOrDefault(RideEventType.UNKNOWN), timestamp = Instant.parse(it.timestamp), confidence = it.confidence, sourcePackage = it.sourcePackage, evidence = runCatching { com.ooro.driver.domain.EventEvidence.valueOf(it.evidence) }.getOrDefault(com.ooro.driver.domain.EventEvidence.UNKNOWN), diagnosticCode = it.diagnosticCode) }); db.rides().markEventsSynced(events.map { it.eventId }) }; val locations = db.locations().pending(50); if (locations.isNotEmpty()) { api.sendLocations(locations.map { LocationSample(it.id, it.rideId, Instant.parse(it.timestamp), it.latitude, it.longitude, it.accuracyMeters, it.speedMps, it.bearing) }); db.locations().markSynced(locations.map { it.id }) }; val dutyLocations = db.dutyLocations().pending(100); dutyLocations.groupBy { it.dutySessionId }.forEach { (dutyId, points) -> api.sendDutyLocations(dutyId, points.map { DutyLocationSample(it.id, it.dutySessionId, Instant.parse(it.timestamp), it.latitude, it.longitude, it.accuracyMeters, it.speedMps, it.bearing) }); db.dutyLocations().markSynced(points.map { it.id }) }; db.proofs().pending(50) }.fold({ Result.success() }, { Result.retry() }) }
}
