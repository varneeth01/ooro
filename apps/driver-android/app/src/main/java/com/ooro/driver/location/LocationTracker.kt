package com.ooro.driver.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.ooro.driver.domain.LocationSample
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.time.Instant

class LocationTracker(context: Context) {
    private val client = LocationServices.getFusedLocationProviderClient(context)
    @SuppressLint("MissingPermission")
    fun samples(rideId: String, intervalMillis: Long): Flow<LocationSample> = callbackFlow { val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, intervalMillis).setMinUpdateIntervalMillis(intervalMillis / 2).build(); val callback = object : com.google.android.gms.location.LocationCallback() { override fun onLocationResult(result: com.google.android.gms.location.LocationResult) { result.locations.forEach { trySend(it.toSample(rideId)) } } }; client.requestLocationUpdates(request, callback, null); awaitClose { client.removeLocationUpdates(callback) } }
    private fun Location.toSample(rideId: String) = LocationSample(rideId = rideId, timestamp = Instant.ofEpochMilli(time), latitude = latitude, longitude = longitude, accuracyMeters = accuracy, speedMps = if (hasSpeed()) speed else null, bearing = if (hasBearing()) bearing else null)
}
