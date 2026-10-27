package com.ooro.driver

import com.ooro.driver.domain.EventEvidence
import com.ooro.driver.domain.RideEventType
import com.ooro.driver.notifications.NotificationInput
import com.ooro.driver.notifications.RideEventAdapterRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationAdapterTest {
    private val registry = RideEventAdapterRegistry()

    @Test fun approvedPackagesNormalizeWithoutRawNotificationPayload() {
        val event = registry.normalize(NotificationInput("com.ubercab.driver", "Uber", "Trip started", 1_000))
        assertEquals("UBER", event?.provider)
        assertEquals(RideEventType.PASSENGER_PICKED_UP, event?.eventType)
        assertEquals(EventEvidence.OBSERVED, event?.evidence)
    }

    @Test fun unsupportedPackagesAreIgnored() {
        assertNull(registry.normalize(NotificationInput("com.example.mail", "Trip started", "Ride started", 1_000)))
        assertNull(registry.providerFor("com.example.mail"))
    }

    @Test fun providerPackageMappingUsesDriverPackageForRapido() {
        assertEquals("RAPIDO", registry.providerFor("com.rapido.driver"))
        assertNull(registry.providerFor("com.rapido.passenger"))
    }
    @Test fun providerFixturesKeepMissingFieldsUnknownWithoutGuessing() {
        assertEquals(RideEventType.RIDE_ACCEPTED, registry.normalize(NotificationInput("com.olacabs.oladriver", "Ola", "New booking", 2_000))?.eventType)
        assertEquals(RideEventType.RIDE_CANCELLED, registry.normalize(NotificationInput("com.rapido.driver", "Rapido", "Ride cancelled", 3_000))?.eventType)
        assertNull(registry.normalize(NotificationInput("com.ubercab.driver", "Uber", "Destination unavailable", 4_000)))
        assertEquals(RideEventType.RIDE_COMPLETED, registry.normalize(NotificationInput("com.rapido.driver", "Rapido", "Ride completed", 5_000))?.eventType)
    }
}
