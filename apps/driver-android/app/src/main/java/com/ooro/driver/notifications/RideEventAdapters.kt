package com.ooro.driver.notifications

import android.service.notification.StatusBarNotification
import android.service.notification.NotificationListenerService
import com.ooro.driver.domain.EventEvidence
import com.ooro.driver.domain.NormalizedRideEvent
import com.ooro.driver.domain.RideEventType
import com.ooro.driver.BuildConfig
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

data class NotificationInput(val packageName: String, val title: String, val text: String, val timestamp: Long)
interface RideEventAdapter { val provider: String; val packages: Set<String>; fun normalize(input: NotificationInput): NormalizedRideEvent? }

abstract class KeywordRideAdapter(override val provider: String, override val packages: Set<String>, private val patterns: Map<RideEventType, List<String>>) : RideEventAdapter {
    override fun normalize(input: NotificationInput): NormalizedRideEvent? { if (input.packageName !in packages) return null; val content = "${input.title} ${input.text}".lowercase(); val match = patterns.entries.firstOrNull { (_, words) -> words.any(content::contains) } ?: return null; val confidence = if (match.key == RideEventType.PASSENGER_PICKED_UP) .94 else .82; return NormalizedRideEvent(provider = provider, eventType = match.key, timestamp = Instant.ofEpochMilli(input.timestamp), confidence = confidence, sourcePackage = input.packageName, evidence = EventEvidence.OBSERVED) }
}
class UberRideEventAdapter : KeywordRideAdapter("UBER", setOf("com.ubercab.driver"), mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("trip started", "rider picked up", "passenger picked up"), RideEventType.RIDE_ACCEPTED to listOf("new trip", "accept trip"), RideEventType.RIDE_CANCELLED to listOf("trip cancelled"), RideEventType.RIDE_COMPLETED to listOf("trip complete", "trip ended")))
class OlaRideEventAdapter : KeywordRideAdapter("OLA", setOf("com.olacabs.oladriver"), mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("ride started", "passenger onboard"), RideEventType.RIDE_ACCEPTED to listOf("new booking", "ride accepted"), RideEventType.RIDE_CANCELLED to listOf("ride cancelled"), RideEventType.RIDE_COMPLETED to listOf("ride completed")))
class RapidoRideEventAdapter : KeywordRideAdapter("RAPIDO", setOf("com.rapido.driver"), mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("ride started", "captain trip started"), RideEventType.RIDE_ACCEPTED to listOf("new ride", "ride accepted"), RideEventType.RIDE_CANCELLED to listOf("ride cancelled"), RideEventType.RIDE_COMPLETED to listOf("ride completed")))
class InternalFixtureRideEventAdapter : KeywordRideAdapter("INTERNAL_FIXTURE", setOf("com.ooro.driver.notificationfixture"), mapOf(RideEventType.PASSENGER_PICKED_UP to listOf("fixture ride started", "fixture pickup"), RideEventType.RIDE_ACCEPTED to listOf("fixture ride accepted", "fixture booking offered"), RideEventType.RIDE_CANCELLED to listOf("fixture ride cancelled"), RideEventType.RIDE_COMPLETED to listOf("fixture ride completed")))

class RideEventAdapterRegistry {
    private val adapters = buildList { add(UberRideEventAdapter()); add(OlaRideEventAdapter()); add(RapidoRideEventAdapter()); if (BuildConfig.INTERNAL_NOTIFICATION_FIXTURE) add(InternalFixtureRideEventAdapter()) }
    fun normalize(input: NotificationInput): NormalizedRideEvent? = adapters.firstOrNull { input.packageName in it.packages }?.normalize(input)
    fun providerFor(packageName: String): String? = adapters.firstOrNull { packageName in it.packages }?.provider
}

class OoroNotificationListenerService : NotificationListenerService() {
    private val registry = RideEventAdapterRegistry()
    private val recent = ConcurrentHashMap<String, Long>()
    override fun onNotificationPosted(sbn: StatusBarNotification) { val prefs = NotificationAccessPreferences(this); if (!prefs.isActivated()) return; val provider = registry.providerFor(sbn.packageName) ?: return; if (!prefs.isProviderEnabled(provider)) return; val extras = sbn.notification.extras; val title = extras.getCharSequence("android.title")?.toString()?.take(160) ?: return; val text = extras.getCharSequence("android.text")?.toString()?.take(500) ?: ""; val event = registry.normalize(NotificationInput(sbn.packageName, title, text, sbn.postTime)) ?: return; val fingerprint = "${event.provider}|${event.eventType}|${event.timestamp.epochSecond / 30}|${event.sourcePackage}"; val now = System.currentTimeMillis(); if (recent.putIfAbsent(fingerprint, now) != null) return; recent.entries.removeIf { now - it.value > 15 * 60_000 }; NormalizedRideEventBus.emit(event) }
    override fun onListenerDisconnected() { super.onListenerDisconnected(); NormalizedRideEventBus.emit(NormalizedRideEvent(provider = "SYSTEM", eventType = RideEventType.UNKNOWN, confidence = 0.0, evidence = EventEvidence.UNKNOWN, diagnosticCode = "LISTENER_DISCONNECTED")) }
}

object NormalizedRideEventBus { private val listeners = mutableSetOf<(NormalizedRideEvent) -> Unit>(); fun subscribe(listener: (NormalizedRideEvent) -> Unit) { listeners += listener }; fun unsubscribe(listener: (NormalizedRideEvent) -> Unit) { listeners -= listener }; fun emit(event: NormalizedRideEvent) { listeners.toList().forEach { it(event) } } }
