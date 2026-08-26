package com.ooro.driver.notifications

import android.service.notification.StatusBarNotification
import com.ooro.driver.domain.*
import java.time.Instant

data class NotificationInput(val packageName: String, val title: String, val text: String, val timestamp: Long)
interface RideEventAdapter { val provider: String; fun normalize(input: NotificationInput): NormalizedRideEvent? }

abstract class KeywordRideAdapter(override val provider: String, private val patterns: Map<RideEventType, List<String>>) : RideEventAdapter {
    override fun normalize(input: NotificationInput): NormalizedRideEvent? { val content = "${input.title} ${input.text}".lowercase(); val match = patterns.entries.firstOrNull { (_, words) -> words.any(content::contains) } ?: return null; return NormalizedRideEvent(provider = provider, eventType = match.key, timestamp = Instant.ofEpochMilli(input.timestamp), confidence = if (match.key == RideEventType.PASSENGER_PICKED_UP) .94 else .82, sourcePackage = input.packageName) }
}
class UberRideEventAdapter : KeywordRideAdapter("UBER", mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("trip started", "rider picked up", "passenger picked up"), RideEventType.RIDE_ACCEPTED to listOf("new trip", "accept trip"), RideEventType.RIDE_CANCELLED to listOf("trip cancelled"), RideEventType.RIDE_COMPLETED to listOf("trip complete", "trip ended")))
class OlaRideEventAdapter : KeywordRideAdapter("OLA", mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("ride started", "passenger onboard"), RideEventType.RIDE_ACCEPTED to listOf("new booking", "ride accepted"), RideEventType.RIDE_CANCELLED to listOf("ride cancelled"), RideEventType.RIDE_COMPLETED to listOf("ride completed")))
class RapidoRideEventAdapter : KeywordRideAdapter("RAPIDO", mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("ride started", "captain trip started"), RideEventType.RIDE_ACCEPTED to listOf("new ride", "ride accepted"), RideEventType.RIDE_CANCELLED to listOf("ride cancelled"), RideEventType.RIDE_COMPLETED to listOf("ride completed")))
class NammaYatriRideEventAdapter : KeywordRideAdapter("NAMMA_YATRI", mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("trip started", "passenger onboard"), RideEventType.RIDE_ACCEPTED to listOf("new ride"), RideEventType.RIDE_CANCELLED to listOf("trip cancelled"), RideEventType.RIDE_COMPLETED to listOf("trip completed")))
class GenericRideEventAdapter : KeywordRideAdapter("OTHER", mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("passenger picked up", "trip started"), RideEventType.RIDE_CANCELLED to listOf("ride cancelled")))

class RideEventAdapterRegistry {
    private val adapters = listOf(UberRideEventAdapter(), OlaRideEventAdapter(), RapidoRideEventAdapter(), NammaYatriRideEventAdapter(), GenericRideEventAdapter())
    private val packageProviders = mapOf("com.ubercab.driver" to "UBER", "com.olacabs.oladriver" to "OLA", "com.rapido.passenger" to "RAPIDO")
    fun normalize(input: NotificationInput): NormalizedRideEvent? = adapters.firstOrNull { it.provider == packageProviders[input.packageName] }?.normalize(input) ?: GenericRideEventAdapter().normalize(input)
}

class OoroNotificationListenerService : android.service.notification.NotificationListenerService() {
    private val registry = RideEventAdapterRegistry()
    override fun onNotificationPosted(sbn: StatusBarNotification) { val extras = sbn.notification.extras; val title = extras.getCharSequence("android.title")?.toString() ?: return; val text = extras.getCharSequence("android.text")?.toString() ?: ""; registry.normalize(NotificationInput(sbn.packageName, title, text, sbn.postTime))?.let { NormalizedRideEventBus.emit(it) } }
}

object NormalizedRideEventBus { private val listeners = mutableSetOf<(NormalizedRideEvent) -> Unit>(); fun subscribe(listener: (NormalizedRideEvent) -> Unit) { listeners += listener }; fun unsubscribe(listener: (NormalizedRideEvent) -> Unit) { listeners -= listener }; fun emit(event: NormalizedRideEvent) { listeners.toList().forEach { it(event) } } }
